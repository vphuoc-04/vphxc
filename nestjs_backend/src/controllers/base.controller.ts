import { Request } from 'express';
import { RequestHelper } from '../helpers/request.helper';
import { UserAgentHelper, DeviceInfo } from '../helpers/user-agent.helper';

/**
 * Lớp BaseController trừu tượng cung cấp các tiện ích lấy ngữ cảnh Client:
 * - getCurrentUserId: Lấy ID người dùng hiện tại từ Request (User Object hoặc header X-User-Id)
 * - getIPAddress: Lấy địa chỉ IP chính xác của Client
 * - getDeviceInfo: Phân tích thông tin thiết bị (OS, Trình duyệt, Loại thiết bị)
 * - getUserAgent: Lấy User-Agent thô từ headers
 */
export abstract class BaseController {
  /**
   * Trích xuất ID người dùng hiện tại từ Request
   */
  protected getCurrentUserId(req?: Request): number | null {
    return RequestHelper.getUserId(req);
  }

  /**
   * Trích xuất địa chỉ IP thực của Client từ Request
   */
  protected getIPAddress(req?: Request): string {
    return RequestHelper.getIPAddress(req);
  }

  /**
   * Alias tương thích ngược cho getIPAddress
   */
  protected getClientIp(req?: Request): string {
    return this.getIPAddress(req);
  }

  /**
   * Phân tích thông tin thiết bị từ User-Agent trong Request
   */
  protected getDeviceInfo(req?: Request): DeviceInfo {
    return UserAgentHelper.parse(req?.headers['user-agent']);
  }

  /**
   * Lấy User-Agent thô từ Request headers
   */
  protected getUserAgent(req?: Request): string | undefined {
    return req?.headers['user-agent'];
  }
}
