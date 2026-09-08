import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { APP_CONSTANTS } from '../constants';
import { AuditLogOptions } from '../decorators/audit-log.decorator';
import { AuditLogService } from '../modules/audit-logs/services/audit-log.service';
import { RequestHelper } from '../helpers/request.helper';
import { UserAgentHelper } from '../helpers/user-agent.helper';

/**
 * Interceptor tự động ghi nhận hoạt động vào bảng NhatKyHeThong cho các endpoint được gắn decorator @AuditLog()
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.getAllAndOverride<AuditLogOptions>(
      APP_CONSTANTS.AUDIT_LOG_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditOptions) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const userId = RequestHelper.getUserId(req);
    const ipAddress = RequestHelper.getIPAddress(req);
    const userAgent = req.headers['user-agent'];
    const deviceInfo = UserAgentHelper.parse(userAgent);

    return next.handle().pipe(
      tap({
        next: () => {
          this.auditLogService.logActivity({
            userId,
            ipAddress,
            spName: `${context.getClass().name}.${context.getHandler().name}`,
            action: auditOptions.action,
            objectType: auditOptions.objectType,
            objectId: req.params?.id || req.body?.id || null,
            detail:
              auditOptions.detail ||
              `Endpoint ${req.method} ${req.url} thực thi thành công`,
            deviceInfo,
            userAgent,
          });
        },
      }),
    );
  }
}
