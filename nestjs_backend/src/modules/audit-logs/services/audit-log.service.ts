import { Injectable, Logger } from '@nestjs/common';
import { SqlHelper } from '../../../database/sql.helper';
import { DeviceInfo } from '../../../helpers/user-agent.helper';

export interface LogActivityParams {
  userId?: number | null;
  ipAddress?: string | null;
  spName?: string | null;
  action: string;
  objectType?: string | null;
  objectId?: string | number | null;
  detail?: string | null;
  deviceInfo?: DeviceInfo | null;
  userAgent?: string | null;
}

/**
 * Service quản lý ghi nhận và truy vấn Nhật ký hoạt động (Audit Logs) vào bảng NhatKyHeThong
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly sqlHelper: SqlHelper) {}

  /**
   * Ghi nhận 1 hành động vào bảng NhatKyHeThong qua Stored Procedure sp_Log_GhiHoatDong
   */
  async logActivity(params: LogActivityParams): Promise<void> {
    const spParams = [
      params.userId ?? null,
      params.ipAddress ?? null,
      params.spName ?? null,
      params.action,
      params.objectType ?? null,
      params.objectId !== undefined && params.objectId !== null
        ? String(params.objectId)
        : null,
      params.detail ?? null,
      params.deviceInfo?.heDieuHanh ?? null,
      params.deviceInfo?.trinhDuyet ?? null,
      params.deviceInfo?.loaiThietBi ?? null,
      params.deviceInfo?.tenThietBi ?? null,
      params.userAgent ?? null,
    ];

    try {
      await this.sqlHelper.execute('sp_Log_GhiHoatDong', spParams);
      this.logger.debug(
        `Đã ghi audit log: [${params.action}] cho User: [${params.userId}]`,
      );
    } catch (error: any) {
      // Safe fallback: Ghi log console nếu DB gặp trục trặc, không chặn luồng chính
      this.logger.warn(
        `Không thể ghi Audit Log vào database: ${error.message}`,
      );
    }
  }

  /**
   * Lấy danh sách nhật ký hoạt động từ CSDL qua Stored Procedure sp_Log_LayDanhSach
   */
  async getAuditLogs(
    userId: number | null,
    ipAddress: string,
    limit: number,
  ): Promise<any[]> {
    const params = [userId, ipAddress, limit];
    return this.sqlHelper.queryForList('sp_Log_LayDanhSach', params);
  }
}
