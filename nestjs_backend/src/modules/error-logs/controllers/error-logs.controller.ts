import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { BaseController } from '../../../controllers/base.controller';
import { ApiResponse } from '../../../responses/api.response';
import { ErrorLogService } from '../services/error-log.service';
import { LogErrorRequest } from '../requests/log-error.request';
import {
  IPAddress,
  CurrentUserId,
  DeviceInfo,
} from '../../../decorators/client-info.decorator';
import type { DeviceInfo as IDeviceInfo } from '../../../helpers/user-agent.helper';

/**
 * Controller quản lý nhật ký lỗi hệ thống (System Error Logs).
 */
@Controller(['api/error-logs', 'api/logs/system-errors'])
export class ErrorLogsController extends BaseController {
  constructor(private readonly errorLogService: ErrorLogService) {
    super();
  }

  /**
   * Lấy danh sách các lỗi hệ thống gần nhất được lưu trong bảng LoiHeThong qua Stored Procedure sp_Loi_LayDanhSach
   */
  @Get()
  async getSystemErrorLogs(
    @CurrentUserId() userId: number | null,
    @IPAddress() ipAddress: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any[]>> {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const errorLogs = await this.errorLogService.getErrorLogs(
      userId,
      ipAddress,
      parsedLimit,
    );
    return ApiResponse.ok(errorLogs, 'Lấy danh sách lỗi hệ thống thành công.');
  }

  /**
   * Nhận thông tin lỗi (ví dụ lỗi crash từ giao diện Frontend) và lưu vào bảng LoiHeThong qua sp_Loi_GhiLoi
   */
  @Post()
  async logSystemError(
    @Body() body: LogErrorRequest,
    @CurrentUserId() userId: number | null,
    @IPAddress() ipAddress: string,
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Req() req: Request,
  ): Promise<ApiResponse<null>> {
    await this.errorLogService.logError({
      userId,
      ipAddress,
      uri: body.duong_dan_uri,
      errorType: body.loai_loi,
      errorMessage: body.mo_ta_loi,
      errorLocation: body.vi_tri_loi,
      stackTrace: body.stack_trace,
      deviceInfo,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.ok(null, 'Ghi nhận lỗi hệ thống thành công.');
  }
}
