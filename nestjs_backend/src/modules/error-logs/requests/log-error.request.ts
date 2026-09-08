import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO Request ghi nhận lỗi hệ thống từ Client.
 */
export class LogErrorRequest {
  @IsNotEmpty({ message: 'Đường dẫn URI không được để trống' })
  @IsString()
  duong_dan_uri!: string;

  @IsNotEmpty({ message: 'Loại lỗi không được để trống' })
  @IsString()
  loai_loi!: string;

  @IsOptional()
  @IsString()
  mo_ta_loi?: string;

  @IsOptional()
  @IsString()
  vi_tri_loi?: string;

  @IsOptional()
  @IsString()
  stack_trace?: string;
}
