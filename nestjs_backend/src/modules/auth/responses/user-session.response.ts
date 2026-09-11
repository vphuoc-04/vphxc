/**
 * Response thông tin một phiên thiết bị đang hoạt động
 */
export class UserSessionResponse {
  Ma_Phien: number;
  Ten_Thiet_Bi: string;
  He_Dieu_Hanh: string;
  Trinh_Duyet: string;
  Loai_Thiet_Bi: string;
  Dia_Chi_IP: string;
  User_Agent: string;
  Hoat_Dong_Cuoi_Cung: Date | string;
  Thoi_Gian_Dang_Nhap: Date | string;
  La_Thiet_Bi_Hien_Tai: boolean;
}
