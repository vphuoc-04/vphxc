import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../responses/api.response';
import { ErrorLogService } from '../modules/error-logs/services/error-log.service';
import { RequestHelper } from '../helpers/request.helper';
import { UserAgentHelper } from '../helpers/user-agent.helper';
import { ErrorExtractorHelper } from '../helpers/error-extractor.helper';

/**
 * Bộ xử lý và bắt ngoại lệ toàn cục cho toàn bộ Rest Controllers trong hệ thống NestJS.
 * Tự động chuyển đổi ngoại lệ thành ApiResponse chuẩn và gọi ErrorLogService lưu lỗi vào CSDL (bảng LoiHeThong).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly errorLogService: ErrorLogService) {}

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã xảy ra lỗi hệ thống.';
    let errorData: any = null;

    // 1. Phân loại ngoại lệ
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const anyRes = res as any;
        message = anyRes.message
          ? Array.isArray(anyRes.message)
            ? anyRes.message.join('; ')
            : anyRes.message
          : exception.message;
        if (anyRes.errors || anyRes.data) {
          errorData = anyRes.errors || anyRes.data;
        }
      } else {
        message = exception.message;
      }
    } else if (exception && typeof exception === 'object') {
      // Bắt các lỗi MySQL hoặc lỗi SQL Stored Procedure
      if (exception.code || exception.errno || exception.sqlState) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = `Lỗi cơ sở dữ liệu MySQL (Mã lỗi ${exception.code || exception.errno}): ${exception.message || 'Thao tác CSDL thất bại.'}`;
      } else {
        message = exception.message || 'Lỗi hệ thống không xác định.';
      }
    }

    // 2. Trích xuất thông tin môi trường và ngữ cảnh lỗi
    const userId = RequestHelper.getUserId(request);
    const ipAddress = RequestHelper.getIPAddress(request);
    const userAgent = request.headers['user-agent'];
    const deviceInfo = UserAgentHelper.parse(userAgent);
    const uri = request
      ? `${request.method} ${request.originalUrl || request.url}`
      : 'UNKNOWN';
    const errorType =
      exception?.name || exception?.constructor?.name || 'GeneralError';
    const errorLocation = ErrorExtractorHelper.extractErrorLocation(exception);
    const stackTrace = ErrorExtractorHelper.extractStackTrace(exception);

    this.logger.error(
      `[GlobalExceptionFilter] ${uri} -> Status: ${status} | Error: ${message} (Location: ${errorLocation})`,
    );

    // 3. Ghi nhận lỗi vào bảng LoiHeThong qua Stored Procedure sp_Loi_GhiLoi
    try {
      await this.errorLogService.logError({
        userId,
        ipAddress,
        uri,
        errorType,
        errorMessage: message,
        errorLocation,
        stackTrace,
        deviceInfo,
        userAgent,
      });
    } catch (logErr: any) {
      this.logger.warn(`Lỗi khi ghi log lỗi vào database: ${logErr.message}`);
    }

    // 4. Trả về ApiResponse chuẩn hóa cho Client
    const apiResponse = ApiResponse.error(message, errorData);
    response.status(status).json(apiResponse);
  }
}
