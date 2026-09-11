import { Injectable } from '@nestjs/common';

interface RequestCounter {
  windowStartTime: number;
  count: number;
}

/**
 * Tiện ích giới hạn tần suất gọi API (In-Memory Sliding/Fixed Window Rate Limiter).
 * Chống tấn công brute-force, DoS và spam request cho các endpoint công khai (Register, Login).
 */
@Injectable()
export class RateLimiterHelper {
  private requestCounts = new Map<string, RequestCounter>();

  /**
   * Kiểm tra xem một định danh (ví dụ IP + hành động) có được phép thực thi tiếp hay không.
   *
   * @param key Khóa định danh (ví dụ: "register:127.0.0.1", "login:127.0.0.1")
   * @param maxRequests Số lượng yêu cầu tối đa cho phép trong khung thời gian
   * @param windowSeconds Độ dài khung thời gian tính bằng giây
   * @returns true nếu còn trong hạn mức, false nếu vượt quá hạn mức
   */
  allowRequest(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): boolean {
    const now = Date.now();
    const windowDurationMillis = windowSeconds * 1000;

    let counter = this.requestCounts.get(key);

    if (!counter || now - counter.windowStartTime > windowDurationMillis) {
      counter = { windowStartTime: now, count: 1 };
      this.requestCounts.set(key, counter);
    } else {
      counter.count++;
    }

    // Tự động dọn dẹp bộ nhớ nếu kích thước map vượt quá 5000 phần tử (chống tràn RAM)
    if (this.requestCounts.size > 5000) {
      for (const [k, c] of this.requestCounts.entries()) {
        if (now - c.windowStartTime > windowDurationMillis) {
          this.requestCounts.delete(k);
        }
      }
    }

    return counter.count <= maxRequests;
  }

  /**
   * Xóa bộ đếm cho một key nhất định (hữu ích cho unit test hoặc reset thủ công)
   */
  reset(key: string): void {
    this.requestCounts.delete(key);
  }
}
