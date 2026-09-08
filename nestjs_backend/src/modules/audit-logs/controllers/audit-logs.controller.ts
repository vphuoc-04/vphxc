import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { BaseController } from '../../../controllers/base.controller';
import { ApiResponse } from '../../../responses/api.response';
import { AuditLogService } from '../services/audit-log.service';
import { LogActionRequest } from '../requests/log-action.request';
import {
  IPAddress,
  CurrentUserId,
  DeviceInfo,
} from '../../../decorators/client-info.decorator';
import type { DeviceInfo as IDeviceInfo } from '../../../helpers/user-agent.helper';

/**
 * Controller quản lý nhật ký hoạt động (Audit Logs).
 */
@Controller(['api/audit-logs', 'api/logs'])
export class AuditLogsController extends BaseController {
  constructor(private readonly auditLogService: AuditLogService) {
    super();
  }

  /**
   * Lấy danh sách nhật ký hoạt động gần nhất từ CSDL qua Stored Procedure sp_Log_LayDanhSach
   */
  @Get()
  async getAuditLogs(
    @CurrentUserId() userId: number | null,
    @IPAddress() ipAddress: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any[]>> {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const logs = await this.auditLogService.getAuditLogs(
      userId,
      ipAddress,
      parsedLimit,
    );
    return ApiResponse.ok(logs, 'Lấy danh sách nhật ký hoạt động thành công.');
  }

  /**
   * Ghi nhận một hành động của người dùng vào bảng NhatKyHeThong qua Stored Procedure sp_Log_GhiHoatDong
   */
  @Post()
  async logAction(
    @Body() body: LogActionRequest,
    @CurrentUserId() userId: number | null,
    @IPAddress() ipAddress: string,
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Req() req: Request,
  ): Promise<ApiResponse<null>> {
    await this.auditLogService.logActivity({
      userId,
      ipAddress,
      spName: body.ten_stored_procedure,
      action: body.hanh_dong,
      objectType: body.loai_doi_tuong,
      objectId: body.ma_doi_tuong,
      detail: body.chi_tiet,
      deviceInfo,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.ok(null, 'Ghi nhận nhật ký hoạt động thành công.');
  }
}
