import * as crypto from 'crypto';

/**
 * Tiện ích băm SHA-256 cho Refresh Token và sinh mã định danh an toàn ngẫu nhiên.
 */
export class SecurityHelper {
  /**
   * Băm chuỗi văn bản (ví dụ Refresh Token raw) bằng thuật toán SHA-256 và trả về chuỗi Hexadecimal
   */
  static sha256Hex(input?: string | null): string {
    if (!input) {
      return '';
    }
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
  }

  /**
   * Sinh chuỗi Refresh Token ngẫu nhiên có độ dài 64 bytes (chuỗi URL-Safe Base64)
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(64).toString('base64url');
  }

  /**
   * Sinh mã UUID v4 định danh Gia đình Token (Token Family) hoặc JWT ID (JTI)
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }
}
