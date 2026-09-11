import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Res,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { BaseController } from '../../../controllers/base.controller';
import { AuthService } from '../services/auth.service';
import { RegisterRequest } from '../requests/register.request';
import { LoginRequest } from '../requests/login.request';
import { ChangePasswordRequest } from '../requests/change-password.request';
import { AuthResponse } from '../responses/auth.response';
import { UserSessionResponse } from '../responses/user-session.response';
import { ApiResponse } from '../../../responses/api.response';
import { Public } from '../../../decorators/public.decorator';
import { CurrentUser } from '../../../decorators/current-user.decorator';

/**
 * Controller phụ trách toàn bộ API Xác thực, Phân quyền, Quản lý Token và Quản lý phiên thiết bị.
 */
@Controller('api/auth')
export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  /**
   * 1. ĐĂNG KÝ TÀI KHOẢN MỚI
   */
  @Public()
  @Post('register')
  async register(
    @Body() body: RegisterRequest,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    const result = await this.authService.register(body, req);
    return ApiResponse.ok(result, 'Đăng ký tài khoản thành công.');
  }

  /**
   * 2. ĐĂNG NHẬP (Nhận Access Token trong Body + Refresh Token trong HttpOnly Cookie)
   */
  @Public()
  @Post('login')
  async login(
    @Body() body: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<AuthResponse>> {
    const authResponse = await this.authService.login(body, req, res);
    return ApiResponse.ok(authResponse, 'Đăng nhập thành công.');
  }

  /**
   * 3. LÀM MỚI ACCESS TOKEN (Refresh Token Rotation + Phát hiện Tái sử dụng Reuse)
   */
  @Public()
  @Post('refresh')
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<AuthResponse>> {
    const authResponse = await this.authService.refreshToken(req, res);
    return ApiResponse.ok(authResponse, 'Làm mới Token thành công.');
  }

  /**
   * 4. ĐĂNG XUẤT THIẾT BỊ HIỆN TẠI
   */
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<null>> {
    await this.authService.logout(req, res);
    return ApiResponse.ok(null, 'Đăng xuất thiết bị thành công.');
  }

  /**
   * 5. ĐĂNG XUẤT TẤT CẢ CÁC THIẾT BỊ
   */
  @Post('logout-all')
  async logoutAll(
    @CurrentUser('id') userId: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<null>> {
    await this.authService.logoutAll(userId, req, res);
    return ApiResponse.ok(
      null,
      'Đã đăng xuất khỏi toàn bộ các thiết bị thành công.',
    );
  }

  /**
   * 6. LẤY DANH SÁCH CÁC THIẾT BỊ / PHIÊN ĐANG ĐĂNG NHẬP
   */
  @Get('sessions')
  async getActiveSessions(
    @CurrentUser('id') userId: number,
    @CurrentUser('sessionId') currentSessionId: number,
  ): Promise<ApiResponse<UserSessionResponse[]>> {
    const sessions = await this.authService.getActiveSessions(
      userId,
      currentSessionId,
    );
    return ApiResponse.ok(sessions, 'Lấy danh sách thiết bị thành công.');
  }

  /**
   * 7. ĐĂNG XUẤT TỪ XA MỘT THIẾT BỊ THEO MÃ PHIÊN (KICK SESSION)
   */
  @Delete('sessions/:sessionId')
  async revokeSession(
    @CurrentUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<ApiResponse<null>> {
    await this.authService.revokeSession(userId, sessionId);
    return ApiResponse.ok(null, 'Thu hồi phiên thiết bị thành công.');
  }

  /**
   * 8. ĐỔI MẬT KHẨU
   */
  @Post('change-password')
  async changePassword(
    @CurrentUser('id') userId: number,
    @CurrentUser('sessionId') currentSessionId: number,
    @Body() body: ChangePasswordRequest,
  ): Promise<ApiResponse<null>> {
    await this.authService.changePassword(userId, currentSessionId, body);
    return ApiResponse.ok(null, 'Đổi mật khẩu thành công.');
  }

  /**
   * 9. LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI
   */
  @Get('me')
  async getCurrentUser(
    @CurrentUser('id') userId: number,
  ): Promise<ApiResponse<any>> {
    const profile = await this.authService.getCurrentUserProfile(userId);
    return ApiResponse.ok(profile, 'Lấy thông tin tài khoản thành công.');
  }
}
