export interface AuthUserInfo {
  Ma_Nguoi_Dung: number;
  Ten_Dang_Nhap: string;
  Email: string;
  Ho_Ten: string;
  Vai_Tro: string;
}

/**
 * Response dữ liệu trả về sau khi xác thực thành công (Login / Refresh)
 */
export class AuthResponse {
  Access_Token: string;
  Token_Type: string = 'Bearer';
  Expires_In: number;
  Ma_Phien: number;
  Nguoi_Dung: AuthUserInfo;
}
