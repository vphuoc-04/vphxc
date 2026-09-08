import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  heDieuHanh: string;
  trinhDuyet: string;
  loaiThietBi:
    | 'DESKTOP'
    | 'MOBILE'
    | 'TABLET'
    | 'POSTMAN'
    | 'BOT'
    | 'SMARTTV'
    | 'WEARABLE'
    | 'CONSOLE'
    | 'KHAC';
  tenThietBi: string;
}

/**
 * Tiện ích phân tích và trích xuất thông tin Hệ điều hành, Trình duyệt, Loại thiết bị từ User-Agent.
 */
export class UserAgentHelper {
  /**
   * Phân tích chuỗi User-Agent thành đối tượng DeviceInfo có cấu trúc
   */
  static parse(userAgent?: string): DeviceInfo {
    if (
      !userAgent ||
      typeof userAgent !== 'string' ||
      userAgent.trim() === ''
    ) {
      return {
        heDieuHanh: 'Không xác định',
        trinhDuyet: 'Không xác định',
        loaiThietBi: 'KHAC',
        tenThietBi: 'Thiết bị không xác định',
      };
    }

    const parser = new UAParser(userAgent);
    const os = parser.getOS();
    const browser = parser.getBrowser();
    const device = parser.getDevice();
    const uaLower = userAgent.toLowerCase();

    // 1. Phân tích Hệ điều hành (OS)
    let heDieuHanh = os.name
      ? os.version
        ? `${os.name} ${os.version}`
        : os.name
      : 'Không xác định';

    // 2. Phân tích Trình duyệt (Browser)
    let trinhDuyet = browser.name
      ? browser.version
        ? `${browser.name} ${browser.version}`
        : browser.name
      : 'Trình duyệt khác';

    // 3. Phân tích Loại thiết bị (Device Type)
    let loaiThietBi: DeviceInfo['loaiThietBi'] = 'DESKTOP';
    const deviceType = device.type;

    if (uaLower.includes('postmanruntime') || uaLower.includes('postman')) {
      heDieuHanh = 'Postman Client';
      trinhDuyet = 'Postman';
      loaiThietBi = 'POSTMAN';
    } else if (uaLower.includes('curl/')) {
      trinhDuyet = 'cURL';
      loaiThietBi = 'KHAC';
    } else if (deviceType === 'tablet' || uaLower.includes('ipad')) {
      loaiThietBi = 'TABLET';
    } else if (
      deviceType === 'mobile' ||
      uaLower.includes('mobile') ||
      uaLower.includes('iphone') ||
      uaLower.includes('android')
    ) {
      loaiThietBi = 'MOBILE';
    } else if (deviceType === 'smarttv') {
      loaiThietBi = 'SMARTTV';
    } else if (deviceType === 'wearable') {
      loaiThietBi = 'WEARABLE';
    } else if (deviceType === 'console') {
      loaiThietBi = 'CONSOLE';
    } else if (
      uaLower.includes('bot') ||
      uaLower.includes('crawler') ||
      uaLower.includes('spider')
    ) {
      loaiThietBi = 'BOT';
    }

    // 4. Tạo tên thiết bị thân thiện
    let tenThietBi = '';
    if (device.vendor || device.model) {
      tenThietBi =
        `${device.vendor || ''} ${device.model || ''} (${trinhDuyet} trên ${heDieuHanh})`.trim();
    } else {
      tenThietBi = `${trinhDuyet} trên ${heDieuHanh}`;
    }

    return {
      heDieuHanh,
      trinhDuyet,
      loaiThietBi,
      tenThietBi,
    };
  }
}
