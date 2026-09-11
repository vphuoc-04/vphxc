import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Request tiếp nhận yêu cầu đổi mật khẩu
 */
export class ChangePasswordRequest {
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu hiện tại.' })
  @IsString()
  Mat_Khau_Cu: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới.' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' })
  Mat_Khau_Moi: string;

  @IsOptional()
  @IsBoolean()
  Dang_Xuat_Thiet_Bi_Khac?: boolean = false;
}
