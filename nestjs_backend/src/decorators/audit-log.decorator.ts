import { SetMetadata } from '@nestjs/common';
import { APP_CONSTANTS } from '../constants';

export interface AuditLogOptions {
  action: string;
  objectType?: string;
  detail?: string;
}

/**
 * Decorator đánh dấu endpoint cần tự động ghi nhật ký hoạt động vào bảng NhatKyHeThong qua AuditLogInterceptor
 */
export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(APP_CONSTANTS.AUDIT_LOG_METADATA_KEY, options);
