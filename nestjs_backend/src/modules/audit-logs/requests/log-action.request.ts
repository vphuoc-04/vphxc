import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO Request ghi nhận nhật ký hoạt động người dùng.
 */
export class LogActionRequest {
  @IsOptional()
  @IsString()
  ten_stored_procedure?: string;

  @IsNotEmpty({ message: 'Hành động không được để trống' })
  @IsString()
  hanh_dong!: string;

  @IsOptional()
  @IsString()
  loai_doi_tuong?: string;

  @IsOptional()
  ma_doi_tuong?: any;

  @IsOptional()
  @IsString()
  chi_tiet?: string;
}
