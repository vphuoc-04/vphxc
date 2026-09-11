import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: number;
  username: string;
  role: string;
  sessionId?: number;
  jti?: string;
}

/**
 * Parameter Decorator @CurrentUser() trích xuất thông tin người dùng đã xác thực từ Request
 * Ví dụ: `@CurrentUser() user: CurrentUserPayload` hoặc `@CurrentUser('id') userId: number`
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
