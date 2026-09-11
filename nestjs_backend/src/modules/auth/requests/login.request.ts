import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Request tiếp nhận yêu cầu đăng nhập từ Client
 */
export class LoginRequest {
  @IsNotEmpty({ message: 'Vui lòng nhập tên đăng nhập hoặc email.' })
  @IsString({ message: 'Tên đăng nhập phải là chuỗi ký tự.' })
  Ten_Dang_Nhap: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu.' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  Mat_Khau: string;

  @IsOptional()
  @IsString()
  Ma_Dinh_Danh_Thiet_Bi?: string;

  @IsOptional()
  @IsString()
  Ten_Thiet_Bi?: string;
}
