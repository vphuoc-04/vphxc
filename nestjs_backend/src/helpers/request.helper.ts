import { Request } from 'express';

const IP_HEADER_CANDIDATES = [
  'x-forwarded-for',
  'proxy-client-ip',
  'wl-proxy-client-ip',
  'http_x_forwarded_for',
  'http_x_forwarded',
  'http_x_cluster_client_ip',
  'http_client_ip',
  'http_forwarded_for',
  'http_forwarded',
  'x-real-ip',
  'cf-connecting-ip',
];

/**
 * Tiện ích trích xuất địa chỉ IP và User ID từ Express Request.
 */
export class RequestHelper {
  /**
   * Trích xuất địa chỉ IP chính xác của Client
   */
  static getIPAddress(req?: Request): string {
    if (!req) {
      return '127.0.0.1';
    }

    for (const header of IP_HEADER_CANDIDATES) {
      const headerVal = req.headers[header];
      if (
        headerVal &&
        typeof headerVal === 'string' &&
        headerVal.toLowerCase() !== 'unknown'
      ) {
        // x-forwarded-for có thể chứa chuỗi proxy IPs "client, proxy1, proxy2"
        const firstIp = headerVal.split(',')[0].trim();
        if (firstIp) {
          return this.normalizeIp(firstIp);
        }
      }
    }

    const remoteAddr = req.ip || req.socket?.remoteAddress;
    return this.normalizeIp(remoteAddr || '127.0.0.1');
  }

  /**
   * Alias tương thích ngược cho getIPAddress
   */
  static getClientIpAddress(req?: Request): string {
    return this.getIPAddress(req);
  }

  /**
   * Chuẩn hóa địa chỉ IPv6 localhost ::1 hoặc ::ffff:127.0.0.1 về 127.0.0.1
   */
  private static normalizeIp(ip: string): string {
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1' || ip === '::ffff:127.0.0.1') {
      return '127.0.0.1';
    }
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }

  /**
   * Trích xuất User ID từ Request User object (sau khi decode token) hoặc header X-User-Id
   */
  static getUserId(req?: Request): number | null {
    if (!req) {
      return null;
    }

    // 1. Kiểm tra Request User Object / Attributes
    const customReq = req as any;
    if (
      customReq.user?.id ||
      customReq.user?.userId ||
      customReq.user?.maNguoiDung
    ) {
      const id =
        customReq.user.id ||
        customReq.user.userId ||
        customReq.user.maNguoiDung;
      const parsed = Number(id);
      if (!isNaN(parsed)) return parsed;
    }

    if (customReq.CURRENT_USER_ID) {
      const parsed = Number(customReq.CURRENT_USER_ID);
      if (!isNaN(parsed)) return parsed;
    }

    // 2. Kiểm tra Header X-User-Id
    const headerUserId = req.headers['x-user-id'];
    if (
      headerUserId &&
      typeof headerUserId === 'string' &&
      headerUserId.trim() !== ''
    ) {
      const parsed = Number(headerUserId.trim());
      if (!isNaN(parsed)) return parsed;
    }

    return null;
  }
}
