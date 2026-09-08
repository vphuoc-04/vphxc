import { Injectable, Logger } from '@nestjs/common';
import { SqlHelper } from '../../../database/sql.helper';
import { DeviceInfo } from '../../../helpers/user-agent.helper';

export interface LogErrorParams {
  userId?: number | null;
  ipAddress?: string | null;
  uri?: string | null;
  errorType?: string | null;
  errorMessage?: string | null;
  errorLocation?: string | null;
  stackTrace?: string | null;
  deviceInfo?: DeviceInfo | null;
  userAgent?: string | null;
}

/**
 * Service quản lý ghi nhận lỗi hệ thống vào bảng LoiHeThong qua Stored Procedure sp_Loi_GhiLoi.
 * Tích hợp cơ chế Safe Fallback đảm bảo không làm gián đoạn luồng xử lý chính.
 */
@Injectable()
export class ErrorLogService {
  private readonly logger = new Logger(ErrorLogService.name);

  constructor(private readonly sqlHelper: SqlHelper) {}

  /**
   * Ghi nhận lỗi hệ thống vào bảng LoiHeThong qua Stored Procedure sp_Loi_GhiLoi
   */
  async logError(params: LogErrorParams): Promise<void> {
    const spParams = [
      params.userId ?? null,
      params.ipAddress ?? null,
      params.uri ?? null,
      params.errorType ?? null,
      params.errorMessage ?? null,
      params.errorLocation ?? null,
      params.stackTrace ?? null,
      params.deviceInfo?.heDieuHanh ?? null,
      params.deviceInfo?.trinhDuyet ?? null,
      params.deviceInfo?.loaiThietBi ?? null,
      params.deviceInfo?.tenThietBi ?? null,
      params.userAgent ?? null,
    ];

    try {
      await this.sqlHelper.execute('sp_Loi_GhiLoi', spParams);
      this.logger.debug(
        `Đã ghi nhận lỗi hệ thống vào bảng LoiHeThong: [${params.errorType}]`,
      );
    } catch (dbError: any) {
      // Safe Fallback: nếu ghi DB thất bại, log console an toàn
      this.logger.warn(
        `Không thể ghi lỗi vào bảng LoiHeThong: ${dbError.message}`,
      );
    }
  }

  /**
   * Lấy danh sách các lỗi hệ thống gần nhất từ CSDL qua Stored Procedure sp_Loi_LayDanhSach
   */
  async getErrorLogs(
    userId: number | null,
    ipAddress: string,
    limit: number,
  ): Promise<any[]> {
    const params = [userId, ipAddress, limit];
    return this.sqlHelper.queryForList('sp_Loi_LayDanhSach', params);
  }
}
