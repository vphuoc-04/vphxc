import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SqlHelper } from '../../../database/sql.helper';

/**
 * Scheduler tự động dọn dẹp Token bị thu hồi đã hết hạn và cập nhật các phiên quá hạn định kỳ trong CSDL.
 */
@Injectable()
export class TokenCleanupScheduler {
  private readonly logger = new Logger(TokenCleanupScheduler.name);

  constructor(private readonly sqlHelper: SqlHelper) { }

  /**
   * Chạy định kỳ mỗi 6 giờ tự động quét dọn database
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      this.logger.log(
        '[TokenCleanupScheduler] Bắt đầu tự động dọn dẹp Token và Phiên đăng nhập hết hạn...',
      );

      const rows = await this.sqlHelper.queryForList(
        'sp_Auth_QuetDonTokenHetHan',
      );

      let cleanedCount = 0;
      if (rows && rows.length > 0 && rows[0].So_Luong_Da_Don !== undefined) {
        cleanedCount = Number(rows[0].So_Luong_Da_Don);
      }

      this.logger.log(
        `[TokenCleanupScheduler] Hoàn tất dọn dẹp. Số lượng bản ghi đã xử lý: ${cleanedCount}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[TokenCleanupScheduler] Lỗi khi thực thi Stored Procedure dọn dẹp: ${error.message}`,
        error.stack,
      );
    }
  }
}
