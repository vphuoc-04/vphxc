import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtHelper } from '../helpers/jwt.helper';
import { SqlHelper } from '../database/sql.helper';
import * as jwt from 'jsonwebtoken';

/**
 * Guard chặn và xác thực Access Token (JWT) trong Header Authorization: Bearer <token>.
 * Kiểm tra tính hợp lệ của token và truy vấn Stored Procedure sp_Auth_KiemTraThuHoiToken để check Blacklist JTI.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtHelper: JwtHelper,
    private readonly sqlHelper: SqlHelper,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Bỏ qua xác thực nếu route hoặc controller có gắn decorator @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Bỏ qua request OPTIONS (CORS preflight)
    if (request.method?.toUpperCase() === 'OPTIONS') {
      return true;
    }

    const authHeader = request.headers['authorization'];

    // 2. Kiểm tra sự tồn tại của Header Authorization
    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập để thực hiện chức năng này.',
      );
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Token xác thực không được để trống.');
    }

    try {
      // 3. Giải mã và kiểm tra chữ ký / hạn sử dụng của JWT
      const claims = this.jwtHelper.parseClaims(token);
      const userId = Number(claims.sub);
      const jti = claims.jti || '';
      const sessionId = claims.sessionId ? Number(claims.sessionId) : null;
      const username = claims.username || '';
      const role = claims.role || 'USER';

      // 4. Kiểm tra danh sách đen (Blacklist JTI) và trạng thái phiên cha trong CSDL
      const rows = await this.sqlHelper.queryForList(
        'sp_Auth_KiemTraThuHoiToken',
        [jti, sessionId],
      );

      if (rows && rows.length > 0) {
        const biThuHoi = Number(rows[0].Bi_Thu_Hoi || 0);
        if (biThuHoi === 1) {
          throw new UnauthorizedException(
            'Phiên đăng nhập này đã bị đăng xuất hoặc thu hồi.',
          );
        }
      }

      // 5. Lưu thông tin xác thực vào Request Context để Controller sử dụng
      const userPayload = {
        id: userId,
        username,
        role,
        sessionId,
        jti,
      };

      (request as any).user = userPayload;
      (request as any).CURRENT_USER_ID = userId;
      (request as any).CURRENT_USER_ROLE = role;
      (request as any).CURRENT_SESSION_ID = sessionId;
      (request as any).CURRENT_TOKEN_JTI = jti;

      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException(
          'Access Token đã hết hạn. Vui lòng làm mới token.',
        );
      }
      this.logger.warn(`Xác thực JWT thất bại: ${error.message}`);
      throw new UnauthorizedException(
        'Token không hợp lệ hoặc đã bị chỉnh sửa.',
      );
    }
  }
}
