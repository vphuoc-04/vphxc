import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface JwtCustomPayload extends jwt.JwtPayload {
  username?: string;
  role?: string;
  sessionId?: number;
  jti?: string;
}

/**
 * Tiện ích sinh, ký và giải mã JSON Web Token (JWT).
 */
@Injectable()
export class JwtHelper {
  private readonly logger = new Logger(JwtHelper.name);
  private readonly secretKey: string;
  private readonly expirationMinutes: number;

  constructor(private readonly configService: ConfigService) {
    const jwtConfig = this.configService.get('jwt') || {};
    this.secretKey =
      jwtConfig.secretKey ||
      'vphxc-super-secret-key-for-jwt-token-signing-must-be-256-bits-long-2026!';
    this.expirationMinutes = jwtConfig.accessTokenExpirationMinutes || 15;
  }

  /**
   * Sinh Access Token (JWT) ngắn hạn chứa JTI, Ma_Nguoi_Dung, Vai_Tro, Ma_Phien
   */
  generateAccessToken(
    userId: number,
    username: string,
    role: string,
    sessionId: number,
    jti: string,
  ): string {
    const payload = {
      username,
      role,
      sessionId,
    };

    return jwt.sign(payload, this.secretKey, {
      algorithm: 'HS256',
      subject: String(userId),
      jwtid: jti,
      expiresIn: `${this.expirationMinutes}m`,
    });
  }

  /**
   * Giải mã và trích xuất Claims từ JWT. Bắn ngoại lệ nếu token hết hạn hoặc sai chữ ký.
   */
  parseClaims(token: string): JwtCustomPayload {
    try {
      return jwt.verify(token, this.secretKey, {
        algorithms: ['HS256'],
      }) as JwtCustomPayload;
    } catch (error: any) {
      if (error instanceof jwt.TokenExpiredError) {
        this.logger.debug(`JWT Token đã hết hạn: ${error.message}`);
      } else {
        this.logger.warn(`Chữ ký JWT không hợp lệ: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Lấy User ID từ Token
   */
  getUserIdFromToken(token: string): number {
    const claims = this.parseClaims(token);
    return Number(claims.sub);
  }

  /**
   * Lấy Session ID (Mã phiên) từ Token
   */
  getSessionIdFromToken(token: string): number | null {
    const claims = this.parseClaims(token);
    return claims.sessionId ? Number(claims.sessionId) : null;
  }

  /**
   * Lấy JTI (Mã định danh Token) từ Token
   */
  getJtiFromToken(token: string): string | undefined {
    const claims = this.parseClaims(token);
    return claims.jti;
  }

  /**
   * Lấy thời gian hết hạn của Token
   */
  getExpirationFromToken(token: string): Date | null {
    const claims = this.parseClaims(token);
    return claims.exp ? new Date(claims.exp * 1000) : null;
  }

  /**
   * Kiểm tra tính hợp lệ của Token mà không ném ngoại lệ
   */
  validateToken(token: string): boolean {
    try {
      this.parseClaims(token);
      return true;
    } catch {
      return false;
    }
  }
}
