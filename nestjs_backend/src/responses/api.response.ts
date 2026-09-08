/**
 * Lớp chuẩn hóa cấu trúc phản hồi JSON (Response Envelope) cho toàn bộ API trong hệ thống.
 * Đồng nhất 100% với định dạng ApiResponse từ Spring Boot backend.
 */
export class ApiResponse<T = any> {
  // Trạng thái thành công hay thất bại của request (mặc định là true)
  success: boolean;

  // Thông điệp phản hồi gửi về cho Client (thông báo kết quả hoặc mô tả lỗi)
  message: string;

  // Dữ liệu chính trả về cho Client (Object, List, Map hoặc null)
  data: T | null;

  // Mốc thời gian thực thi request (Epoch milliseconds UTC)
  timestamp: number;

  constructor(
    success: boolean,
    message: string,
    data: T | null = null,
    timestamp?: number,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.timestamp = timestamp ?? Date.now();
  }

  /**
   * Tạo phản hồi thành công kèm theo dữ liệu và thông điệp tùy chỉnh
   */
  static ok<T>(
    data?: T,
    message: string = 'Thao tác thành công.',
  ): ApiResponse<T> {
    return new ApiResponse<T>(
      true,
      message,
      data !== undefined ? data : null,
      Date.now(),
    );
  }

  /**
   * Tạo phản hồi thành công chỉ kèm thông điệp (data là null)
   */
  static message(message: string): ApiResponse<null> {
    return new ApiResponse<null>(true, message, null, Date.now());
  }

  /**
   * Tạo phản hồi lỗi kèm thông điệp và dữ liệu chi tiết tùy chọn
   */
  static error<T = any>(
    message: string = 'Đã xảy ra lỗi hệ thống.',
    data?: T,
  ): ApiResponse<T> {
    return new ApiResponse<T>(
      false,
      message,
      data !== undefined ? data : null,
      Date.now(),
    );
  }
}
