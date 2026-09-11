import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

/**
 * Tiện ích thao tác HttpOnly Cookie cho Refresh Token an toàn tuyệt đối.
 */
@Injectable()
export class CookieHelper {
  private readonly cookieName: string;
  private readonly expirationDays: number;
  private readonly secure: boolean;
  private readonly sameSite: 'lax' | 'strict' | 'none';

  constructor(private readonly configService: ConfigService) {
    const jwtConfig = this.configService.get('jwt') || {};
    this.cookieName = jwtConfig.cookieName || 'refreshToken';
    this.expirationDays = jwtConfig.refreshTokenExpirationDays || 30;
    this.secure = jwtConfig.cookieSecure ?? false;
    this.sameSite = jwtConfig.cookieSameSite || 'lax';
  }

  /**
   * Đính kèm Refresh Token vào Response dưới dạng HttpOnly Cookie bảo mật cao
   */
  setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const maxAgeMillis = this.expirationDays * 24 * 60 * 60 * 1000;

    res.cookie(this.cookieName, refreshToken, {
      httpOnly: true, // JavaScript client không thể đọc được (chống XSS)
      secure: this.secure, // Chỉ gửi qua HTTPS khi bật
      sameSite: this.sameSite, // Chống tấn công CSRF
      path: '/',
      maxAge: maxAgeMillis,
    });
  }

  /**
   * Xóa Refresh Token Cookie khi người dùng đăng xuất
   */
  clearRefreshTokenCookie(res: Response): void {
    res.cookie(this.cookieName, '', {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: '/',
      maxAge: 0, // Hết hạn ngay lập tức
    });
  }

  /**
   * Lấy giá trị Refresh Token từ Request Cookies
   */
  getRefreshTokenFromCookie(req: Request): string | null {
    if (!req) {
      return null;
    }
    // 1. Kiểm tra req.cookies (được nạp bởi cookie-parser middleware)
    if (req.cookies && req.cookies[this.cookieName]) {
      return req.cookies[this.cookieName];
    }
    // 2. Parse thủ công từ header Cookie nếu cookie-parser chưa kịp parse
    const rawCookie = req.headers?.cookie;
    if (rawCookie) {
      const match = rawCookie
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${this.cookieName}=`));
      if (match) {
        return decodeURIComponent(match.substring(this.cookieName.length + 1));
      }
    }
    return null;
  }
}
