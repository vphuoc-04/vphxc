import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../responses/api.response';

/**
 * Interceptor chuẩn hóa dữ liệu trả về của Controller thành định dạng ApiResponse nếu Controller chưa bọc sẵn.
 */
@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Nếu response đã là instance hoặc có cấu trúc của ApiResponse, giữ nguyên
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'message' in data &&
          'timestamp' in data
        ) {
          return data;
        }

        // Tự động đóng gói vào ApiResponse.ok()
        return ApiResponse.ok(data);
      }),
    );
  }
}
