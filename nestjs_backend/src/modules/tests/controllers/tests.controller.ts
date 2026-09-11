import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { BaseController } from '../../../controllers/base.controller';
import { ApiResponse } from '../../../responses/api.response';
import { SqlHelper } from '../../../database/sql.helper';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { ErrorLogService } from '../../error-logs/services/error-log.service';
import {
  IPAddress,
  CurrentUserId,
  DeviceInfo,
} from '../../../decorators/client-info.decorator';
import type { DeviceInfo as IDeviceInfo } from '../../../helpers/user-agent.helper';
import { Public } from '../../../decorators/public.decorator';

/**
 * Controller kiểm thử chuyên dụng: kiểm tra toàn diện các định dạng của ApiResponse,
 * thử nghiệm kích hoạt lỗi để ghi log tự động vào MySQL vphxc, và đối soát dữ liệu 2 bảng nhật ký.
 */
@Public()
@Controller('test')
export class TestsController extends BaseController {
  constructor(
    private readonly sqlHelper: SqlHelper,
    private readonly auditLogService: AuditLogService,
    private readonly errorLogService: ErrorLogService,
  ) {
    super();
  }

  // 1. KIỂM THỬ CÁC ĐỊNH DẠNG APIRESPONSE

  /**
   * Test trường hợp trả về dữ liệu kèm thông điệp: ApiResponse.ok(data, message) -> HTTP 200
   */
  @Get('response/ok-data-message')
  testOkDataMessage(): ApiResponse<any> {
    const sampleData = {
      module: 'TestModule',
      framework: 'NestJS',
      version: '1.0.0',
      status: 'ACTIVE',
    };
    return ApiResponse.ok(
      sampleData,
      'Test định dạng: ok(data, message) thành công.',
    );
  }

  /**
   * Test trường hợp chỉ trả về dữ liệu: ApiResponse.ok(data) -> HTTP 200
   */
  @Get('response/ok-data')
  testOkData(): ApiResponse<string[]> {
    const list = ['Quyền xem', 'Quyền thêm', 'Quyền sửa', 'Quyền xóa'];
    return ApiResponse.ok(list);
  }

  /**
   * Test trường hợp chỉ trả về thông điệp thành công: ApiResponse.message(message) -> HTTP 200
   */
  @Get('response/ok-message')
  testOkMessage(): ApiResponse<null> {
    return ApiResponse.message('Test định dạng: ok(message) không có data.');
  }

  /**
   * Test trường hợp trả về thông báo lỗi: ApiResponse.error(message) -> HTTP 400 Bad Request
   */
  @Get('response/error-message')
  testErrorMessage(): never {
    throw new BadRequestException(
      'Test định dạng: error(message) với mã lỗi 400.',
    );
  }

  /**
   * Test trường hợp trả về lỗi kèm danh sách validation: ApiResponse.error(data, message) -> HTTP 422
   */
  @Get('response/error-data-message')
  testErrorDataMessage(): never {
    const fieldErrors = {
      username: 'Tên đăng nhập không được chứa ký tự đặc biệt',
      email: 'Email không đúng định dạng chuẩn',
    };
    throw new HttpException(
      ApiResponse.error('Dữ liệu gửi lên không hợp lệ.', fieldErrors),
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  /**
   * Test các hàm tiện ích kế thừa từ BaseController
   */
  @Get('response/base-helpers')
  testBaseControllerHelpers(@Req() req: Request): ApiResponse<any> {
    const userId = this.getCurrentUserId(req);
    const ipAddress = this.getIPAddress(req);
    const deviceInfo = this.getDeviceInfo(req);

    const info = {
      current_user_id: userId,
      ip_address: ipAddress,
      device_info: deviceInfo,
    };
    return ApiResponse.ok(
      info,
      'Test các helper kế thừa từ BaseController (getCurrentUserId, getIPAddress, getDeviceInfo) thành công.',
    );
  }

  // 2. KIỂM THỬ NGOẠI LỆ & TỰ ĐỘNG GHI BẢNG LOIHETHONG

  /**
   * Test ném lỗi tham số không hợp lệ (BadRequestException) -> GlobalExceptionFilter bắt và ghi bảng LoiHeThong
   */
  @Get('errors/bad-request')
  testBadRequestException(
    @Query('age') ageParam?: string,
  ): ApiResponse<string> {
    const age = ageParam !== undefined ? parseInt(ageParam, 10) : -5;
    if (isNaN(age) || age < 0) {
      throw new BadRequestException(
        `Tuổi không thể là số âm (giá trị nhận được: ${ageParam}).`,
      );
    }
    return ApiResponse.ok(`Tuổi hợp lệ: ${age}`);
  }

  /**
   * Test ném lỗi Null / Type Error (TypeError) -> GlobalExceptionFilter bắt và ghi bảng LoiHeThong
   */
  @Get('errors/null-pointer')
  testNullPointerException(): ApiResponse<any> {
    const nullObj: any = null;
    // Cố tình truy cập thuộc tính trên null để phát sinh TypeError
    const val = nullObj.someProperty.toString();
    return ApiResponse.ok(val);
  }

  /**
   * Test ném lỗi toán học / logic -> GlobalExceptionFilter bắt và ghi bảng LoiHeThong
   */
  @Get('errors/math-error')
  testArithmeticException(): never {
    throw new Error(
      'Cố tình kích hoạt lỗi ArithmeticException / Logic Error để kiểm tra ghi log hệ thống.',
    );
  }

  /**
   * Test gọi Stored Procedure không tồn tại trong MySQL -> GlobalExceptionFilter bắt và ghi bảng LoiHeThong
   */
  @Get('errors/sql-not-found')
  async testSqlNotFoundException(): Promise<any> {
    return this.sqlHelper.execute('sp_KhongTonTai_TestLoi', ['test_value']);
  }

  // 3. KIỂM THỬ GHI LOG HOẠT ĐỘNG, AGENT VÀ ĐỐI SOÁT DỮ LIỆU

  /**
   * Ghi thử một dòng hoạt động vào bảng NhatKyHeThong qua Stored Procedure sp_Log_GhiHoatDong
   */
  @Post('logs/action')
  async testLogAction(
    @CurrentUserId() userId: number | null,
    @IPAddress() ipAddress: string,
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Req() req: Request,
    @Query('action') action?: string,
    @Query('detail') detail?: string,
  ): Promise<ApiResponse<null>> {
    await this.auditLogService.logActivity({
      userId,
      ipAddress,
      spName: 'sp_Log_GhiHoatDong',
      action: action || 'TEST_CHUC_NANG',
      objectType: 'TEST',
      objectId: '001',
      detail: detail || 'Kiểm tra ghi log hoạt động tự động từ NestJS Backend',
      deviceInfo,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.ok(
      null,
      'Đã gọi sp_Log_GhiHoatDong để ghi log hoạt động thành công.',
    );
  }

  /**
   * Lấy tổng quan cả 2 bảng (NhatKyHeThong và LoiHeThong) để đối soát tức thì
   */
  @Get('logs/overview')
  async testGetLogsOverview(
    @CurrentUserId() userId: number | null,
    @IPAddress() ipAddress: string,
  ): Promise<ApiResponse<any>> {
    const auditLogs = await this.auditLogService.getAuditLogs(
      userId,
      ipAddress,
      100,
    );
    const errorLogs = await this.errorLogService.getErrorLogs(
      userId,
      ipAddress,
      100,
    );

    const result = {
      tong_so_audit_logs: auditLogs.length,
      danh_sach_audit_logs: auditLogs,
      tong_so_error_logs: errorLogs.length,
      danh_sach_error_logs: errorLogs,
    };

    return ApiResponse.ok(
      result,
      'Lấy tổng quan nhật ký hoạt động và nhật ký lỗi thành công.',
    );
  }

  /**
   * Kiểm thử phân tích thông tin thiết bị (User-Agent, OS, Browser, Device Type, Real IP)
   */
  @Get('agent/device-info')
  testDeviceInfo(
    @IPAddress() ipAddress: string,
    @DeviceInfo() deviceInfo: IDeviceInfo,
    @Req() req: Request,
  ): ApiResponse<any> {
    const userAgent = req.headers['user-agent'];
    const result = {
      real_ip: ipAddress,
      parsed_device: deviceInfo,
      raw_user_agent: userAgent,
    };

    return ApiResponse.ok(
      result,
      'Kiểm thử phân tích thông tin thiết bị và địa chỉ IP thành công.',
    );
  }
}
