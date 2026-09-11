import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { SqlHelper } from '../../../database/sql.helper';
import { JwtHelper } from '../../../helpers/jwt.helper';
import { CookieHelper } from '../../../helpers/cookie.helper';
import { SecurityHelper } from '../../../helpers/security.helper';
import { RateLimiterHelper } from '../../../helpers/rate-limiter.helper';
import { RequestHelper } from '../../../helpers/request.helper';
import { UserAgentHelper } from '../../../helpers/user-agent.helper';
import { RegisterRequest } from '../requests/register.request';
import { LoginRequest } from '../requests/login.request';
import { ChangePasswordRequest } from '../requests/change-password.request';
import { AuthResponse } from '../responses/auth.response';
import { UserSessionResponse } from '../responses/user-session.response';

/**
 * Service xử lý toàn bộ nghiệp vụ Xác thực, Quản lý Token, Quản lý phiên đa thiết bị.
 * Mã hóa mật khẩu trực tiếp qua Stored Procedure MySQL (Salted SHA-256).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpirationMinutes: number;
  private readonly refreshTokenExpirationDays: number;

  constructor(
    private readonly sqlHelper: SqlHelper,
    private readonly jwtHelper: JwtHelper,
    private readonly cookieHelper: CookieHelper,
    private readonly rateLimiterHelper: RateLimiterHelper,
    private readonly configService: ConfigService,
  ) {
    const jwtConfig = this.configService.get('jwt') || {};
    this.accessTokenExpirationMinutes =
      jwtConfig.accessTokenExpirationMinutes || 15;
    this.refreshTokenExpirationDays =
      jwtConfig.refreshTokenExpirationDays || 30;
  }

  /**
   * 1. ĐĂNG KÝ TÀI KHOẢN MỚI
   * (MySQL tự sinh Salt ngẫu nhiên và băm SHA-256 nội tại qua sp_Auth_DangKyNguoiDung)
   */
  async register(body: RegisterRequest, req: Request): Promise<any> {
    const clientIp = RequestHelper.getClientIpAddress(req);

    // Giới hạn tần suất đăng ký: tối đa 10 request / 60 giây từ 1 IP
    if (!this.rateLimiterHelper.allowRequest(`register:${clientIp}`, 10, 60)) {
      throw new BadRequestException(
        'Bạn đã gửi quá nhiều yêu cầu đăng ký từ địa chỉ IP này. Vui lòng thử lại sau 1 phút.',
      );
    }

    const params = [
      body.Ten_Dang_Nhap.trim(),
      body.Email.trim().toLowerCase(),
      body.So_Dien_Thoai ? body.So_Dien_Thoai.trim() : null,
      body.Mat_Khau,
      body.Ho_Ten ? body.Ho_Ten.trim() : body.Ten_Dang_Nhap.trim(),
      body.Vai_Tro ? body.Vai_Tro.trim() : 'USER',
    ];

    const rows = await this.sqlHelper.queryForList(
      'sp_Auth_DangKyNguoiDung',
      params,
    );

    if (!rows || rows.length === 0) {
      throw new InternalServerErrorException(
        'Đăng ký tài khoản thất bại, không nhận được phản hồi từ cơ sở dữ liệu.',
      );
    }

    const row = rows[0];
    if (Number(row.Ket_Qua) !== 1) {
      throw new BadRequestException(
        row.Thong_Bao || 'Đăng ký tài khoản không thành công.',
      );
    }

    return {
      Ma_Nguoi_Dung: row.Ma_Nguoi_Dung,
      Ten_Dang_Nhap: row.Ten_Dang_Nhap,
      Email: row.Email,
      Ho_Ten: row.Ho_Ten,
      Vai_Tro: row.Vai_Tro,
      Thong_Bao: row.Thong_Bao,
    };
  }

  /**
   * 2. ĐĂNG NHẬP NGUYÊN TỬ (Single Roundtrip Atomic Login)
   * Stored Procedure sp_Auth_DangNhap tự động kiểm tra tài khoản, so khớp Salted SHA-256,
   * đếm sai 5 lần để khóa 15 phút, và khởi tạo phiên thiết bị.
   */
  async login(
    body: LoginRequest,
    req: Request,
    res: Response,
  ): Promise<AuthResponse> {
    const clientIp = RequestHelper.getClientIpAddress(req);

    // Giới hạn tần suất đăng nhập theo IP: tối đa 30 request / 60 giây
    if (!this.rateLimiterHelper.allowRequest(`login:${clientIp}`, 30, 60)) {
      throw new BadRequestException(
        'Quá nhiều yêu cầu đăng nhập từ địa chỉ IP này. Vui lòng thử lại sau 1 phút.',
      );
    }

    const rawUserAgent = req.headers['user-agent'] || '';
    const deviceInfo = UserAgentHelper.parse(rawUserAgent);

    const tenThietBi = body.Ten_Thiet_Bi || deviceInfo.tenThietBi;
    const maDinhDanhThietBi =
      body.Ma_Dinh_Danh_Thiet_Bi || SecurityHelper.generateUUID();

    // Chuẩn bị thông tin Token
    const rawRefreshToken = SecurityHelper.generateSecureToken();
    const refreshTokenHash = SecurityHelper.sha256Hex(rawRefreshToken);
    const maGiaDinhToken = SecurityHelper.generateUUID();
    const jti = SecurityHelper.generateUUID();

    const params = [
      body.Ten_Dang_Nhap.trim(),
      body.Mat_Khau,
      clientIp,
      deviceInfo.heDieuHanh,
      deviceInfo.trinhDuyet,
      deviceInfo.loaiThietBi,
      tenThietBi,
      rawUserAgent,
      refreshTokenHash,
      maGiaDinhToken,
      maDinhDanhThietBi,
      this.refreshTokenExpirationDays,
    ];

    const rows = await this.sqlHelper.queryForList('sp_Auth_DangNhap', params);
    if (!rows || rows.length === 0) {
      throw new InternalServerErrorException(
        'Không thể khởi tạo phiên đăng nhập.',
      );
    }

    const row = rows[0];
    if (Number(row.Ket_Qua) !== 1) {
      if (row.Ma_Loi === 'TAI_KHOAN_BI_KHOA') {
        throw new ForbiddenException(row.Thong_Bao);
      }
      if (
        row.Ma_Loi === 'SAI_MAT_KHAU' ||
        row.Ma_Loi === 'TAI_KHOAN_KHONG_TON_TAI'
      ) {
        throw new UnauthorizedException(row.Thong_Bao);
      }
      throw new BadRequestException(
        row.Thong_Bao || 'Đăng nhập không thành công.',
      );
    }

    const maPhien = Number(row.Ma_Phien);
    const maNguoiDung = Number(row.Ma_Nguoi_Dung);
    const tenNguoiDung = row.Ten_Dang_Nhap;
    const vaiTro = row.Vai_Tro || 'USER';

    // Sinh Access Token (JWT)
    const accessToken = this.jwtHelper.generateAccessToken(
      maNguoiDung,
      tenNguoiDung,
      vaiTro,
      maPhien,
      jti,
    );

    // Ghi Refresh Token vào HttpOnly Cookie
    this.cookieHelper.setRefreshTokenCookie(res, rawRefreshToken);

    return {
      Access_Token: accessToken,
      Token_Type: 'Bearer',
      Expires_In: this.accessTokenExpirationMinutes * 60,
      Ma_Phien: maPhien,
      Nguoi_Dung: {
        Ma_Nguoi_Dung: maNguoiDung,
        Ten_Dang_Nhap: tenNguoiDung,
        Email: row.Email,
        Ho_Ten: row.Ho_Ten,
        Vai_Tro: vaiTro,
      },
    };
  }

  /**
   * 3. LÀM MỚI TOKEN (Refresh Token Rotation + Phát hiện Tái sử dụng Reuse)
   */
  async refreshToken(req: Request, res: Response): Promise<AuthResponse> {
    let rawOldRefreshToken = this.cookieHelper.getRefreshTokenFromCookie(req);
    if (!rawOldRefreshToken) {
      rawOldRefreshToken = (req.headers['x-refresh-token'] as string) || null;
    }

    if (!rawOldRefreshToken) {
      throw new UnauthorizedException(
        'Không tìm thấy Refresh Token hợp lệ. Vui lòng đăng nhập lại.',
      );
    }

    const clientIp = RequestHelper.getClientIpAddress(req);
    const rawUserAgent = req.headers['user-agent'] || '';
    const deviceInfo = UserAgentHelper.parse(rawUserAgent);

    const oldHash = SecurityHelper.sha256Hex(rawOldRefreshToken);
    const newRawRefreshToken = SecurityHelper.generateSecureToken();
    const newHash = SecurityHelper.sha256Hex(newRawRefreshToken);

    const params = [
      oldHash,
      newHash,
      clientIp,
      deviceInfo.heDieuHanh,
      deviceInfo.trinhDuyet,
      deviceInfo.loaiThietBi,
      deviceInfo.tenThietBi,
      rawUserAgent,
      this.refreshTokenExpirationDays,
    ];

    const rows = await this.sqlHelper.queryForList(
      'sp_Auth_LamMoiToken',
      params,
    );
    if (!rows || rows.length === 0) {
      this.cookieHelper.clearRefreshTokenCookie(res);
      throw new UnauthorizedException('Làm mới token không thành công.');
    }

    const row = rows[0];
    if (Number(row.Ket_Qua) !== 1) {
      this.cookieHelper.clearRefreshTokenCookie(res);
      if (row.Ma_Loi === 'TOKEN_REUSE_DETECTED') {
        this.logger.warn(
          `CẢNH BÁO AN NINH: Phát hiện tấn công tái sử dụng Token từ IP: ${clientIp}`,
        );
      }
      throw new UnauthorizedException(
        row.Thong_Bao || 'Phiên đăng nhập không hợp lệ.',
      );
    }

    const maNguoiDung = Number(row.Ma_Nguoi_Dung);
    const tenDangNhap = row.Ten_Dang_Nhap;
    const vaiTro = row.Vai_Tro || 'USER';
    const maPhienMoi = Number(row.Ma_Phien);
    const jti = SecurityHelper.generateUUID();

    const newAccessToken = this.jwtHelper.generateAccessToken(
      maNguoiDung,
      tenDangNhap,
      vaiTro,
      maPhienMoi,
      jti,
    );

    // Ghi Refresh Token mới vào Cookie
    this.cookieHelper.setRefreshTokenCookie(res, newRawRefreshToken);

    return {
      Access_Token: newAccessToken,
      Token_Type: 'Bearer',
      Expires_In: this.accessTokenExpirationMinutes * 60,
      Ma_Phien: maPhienMoi,
      Nguoi_Dung: {
        Ma_Nguoi_Dung: maNguoiDung,
        Ten_Dang_Nhap: tenDangNhap,
        Email: row.Email,
        Ho_Ten: row.Ho_Ten,
        Vai_Tro: vaiTro,
      },
    };
  }

  /**
   * 4. ĐĂNG XUẤT THIẾT BỊ HIỆN TẠI
   */
  async logout(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = this.cookieHelper.getRefreshTokenFromCookie(req);
    const refreshTokenHash = rawRefreshToken
      ? SecurityHelper.sha256Hex(rawRefreshToken)
      : '';

    const authHeader = req.headers['authorization'];
    let jti: string | null = null;
    let tokenExpiry: Date | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const claims = this.jwtHelper.parseClaims(token);
        jti = claims.jti || null;
        tokenExpiry = claims.exp ? new Date(claims.exp * 1000) : null;
      } catch {
        // Bỏ qua lỗi parse token khi logout
      }
    }

    const params = [refreshTokenHash, jti, tokenExpiry];
    await this.sqlHelper.execute('sp_Auth_DangXuatThietBi', params);
    this.cookieHelper.clearRefreshTokenCookie(res);
  }

  /**
   * 5. ĐĂNG XUẤT TẤT CẢ CÁC THIẾT BỊ
   */
  async logoutAll(userId: number, req: Request, res: Response): Promise<void> {
    if (!userId || userId <= 0) {
      throw new UnauthorizedException(
        'Không xác định được danh tính người dùng.',
      );
    }

    const authHeader = req.headers['authorization'];
    let jti: string | null = null;
    let tokenExpiry: Date | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const claims = this.jwtHelper.parseClaims(
          authHeader.substring(7).trim(),
        );
        jti = claims.jti || null;
        tokenExpiry = claims.exp ? new Date(claims.exp * 1000) : null;
      } catch {
        // Bỏ qua lỗi parse token khi logout
      }
    }

    const params = [userId, jti, tokenExpiry];
    await this.sqlHelper.execute('sp_Auth_DangXuatTatCa', params);
    this.cookieHelper.clearRefreshTokenCookie(res);
  }

  /**
   * 6. LẤY DANH SÁCH CÁC THIẾT BỊ ĐANG ĐĂNG NHẬP
   */
  async getActiveSessions(
    userId: number,
    currentSessionId: number | null,
  ): Promise<UserSessionResponse[]> {
    if (!userId || userId <= 0) {
      throw new UnauthorizedException(
        'Không xác định được danh tính người dùng.',
      );
    }

    const rows = await this.sqlHelper.queryForList(
      'sp_Auth_LayDanhSachThietBi',
      [userId, currentSessionId || 0],
    );

    return rows.map((row) => ({
      Ma_Phien: Number(row.Ma_Phien),
      Ten_Thiet_Bi: row.Ten_Thiet_Bi,
      He_Dieu_Hanh: row.He_Dieu_Hanh,
      Trinh_Duyet: row.Trinh_Duyet,
      Loai_Thiet_Bi: row.Loai_Thiet_Bi,
      Dia_Chi_IP: row.Dia_Chi_IP,
      User_Agent: row.User_Agent,
      Hoat_Dong_Cuoi_Cung: row.Hoat_Dong_Cuoi_Cung,
      Thoi_Gian_Dang_Nhap: row.Thoi_Gian_Dang_Nhap,
      La_Thiet_Bi_Hien_Tai: Number(row.La_Thiet_Bi_Hien_Tai) === 1,
    }));
  }

  /**
   * 7. THU HỒI / ĐĂNG XUẤT TỪ XA MỘT THIẾT BỊ (Kick Session)
   */
  async revokeSession(
    userId: number,
    sessionIdToRevoke: number,
  ): Promise<void> {
    if (!userId || !sessionIdToRevoke) {
      throw new BadRequestException('Tham số không hợp lệ.');
    }

    await this.sqlHelper.execute('sp_Auth_ThuHoiPhien', [
      userId,
      sessionIdToRevoke,
    ]);
  }

  /**
   * 8. ĐỔI MẬT KHẨU
   * (So khớp mật khẩu cũ và băm mật khẩu mới hoàn toàn trong MySQL)
   */
  async changePassword(
    userId: number,
    currentSessionId: number | null,
    body: ChangePasswordRequest,
  ): Promise<void> {
    if (!userId || userId <= 0) {
      throw new UnauthorizedException(
        'Không xác định được danh tính người dùng.',
      );
    }

    const params = [
      userId,
      body.Mat_Khau_Cu,
      body.Mat_Khau_Moi,
      body.Dang_Xuat_Thiet_Bi_Khac ? 1 : 0,
      currentSessionId || 0,
    ];

    const rows = await this.sqlHelper.queryForList(
      'sp_Auth_CapNhatMatKhau',
      params,
    );

    if (!rows || rows.length === 0) {
      throw new InternalServerErrorException('Không thể cập nhật mật khẩu.');
    }

    const row = rows[0];
    if (Number(row.Ket_Qua) !== 1) {
      throw new BadRequestException(
        row.Thong_Bao || 'Cập nhật mật khẩu thất bại.',
      );
    }
  }

  /**
   * 9. LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI
   */
  async getCurrentUserProfile(userId: number): Promise<any> {
    if (!userId || userId <= 0) {
      throw new UnauthorizedException('Không xác định được danh tính.');
    }

    const sql = `
      SELECT Ma_Nguoi_Dung, Ten_Dang_Nhap, Email, So_Dien_Thoai, Ho_Ten, Vai_Tro, Trang_Thai_Tai_Khoan, Ngay_Tao, Ngay_Cap_Nhat
      FROM NguoiDung
      WHERE Ma_Nguoi_Dung = ?
    `;

    const users = await this.sqlHelper.rawQuery<any[]>(sql, [userId]);
    if (!users || users.length === 0) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản.');
    }

    return users[0];
  }
}
