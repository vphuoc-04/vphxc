import {
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsString,
} from 'class-validator';

/**
 * Request tiếp nhận yêu cầu đăng ký người dùng mới
 */
export class RegisterRequest {
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống.' })
  @IsString({ message: 'Tên đăng nhập phải là chuỗi ký tự.' })
  @MinLength(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' })
  @MaxLength(50, { message: 'Tên đăng nhập tối đa 50 ký tự.' })
  Ten_Dang_Nhap: string;

  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng.' })
  @MaxLength(100, { message: 'Email tối đa 100 ký tự.' })
  Email: string;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự.' })
  @MaxLength(20, { message: 'Số điện thoại tối đa 20 ký tự.' })
  So_Dien_Thoai?: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
  @MaxLength(50, { message: 'Mật khẩu tối đa 50 ký tự.' })
  Mat_Khau: string;

  @IsNotEmpty({ message: 'Họ tên không được để trống.' })
  @IsString({ message: 'Họ tên phải là chuỗi ký tự.' })
  @MaxLength(100, { message: 'Họ tên tối đa 100 ký tự.' })
  Ho_Ten: string;

  @IsOptional()
  @IsString()
  Vai_Tro?: string = 'USER';
}
