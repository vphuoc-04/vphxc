import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator đánh dấu endpoint không yêu cầu xác thực JWT (bỏ qua JwtAuthGuard)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
