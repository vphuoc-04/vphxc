/**
 * Tiện ích trích xuất vị trí phát sinh lỗi trong mã nguồn và định dạng StackTrace.
 */
export class ErrorExtractorHelper {
  /**
   * Trích xuất vị trí lỗi cụ thể trong source code (file và dòng code thuộc thư mục src)
   */
  static extractErrorLocation(error: any): string {
    if (!error) {
      return 'N/A';
    }

    const stack = error.stack || (error instanceof Error ? error.stack : '');
    if (!stack || typeof stack !== 'string') {
      return 'N/A';
    }

    const lines = stack.split('\n');

    // Tìm dòng lỗi đầu tiên chứa đường dẫn source code src/
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        (trimmed.includes('/src/') ||
          trimmed.includes('\\src\\') ||
          trimmed.includes('src/')) &&
        !trimmed.includes('node_modules')
      ) {
        // Làm sạch chuỗi vị trí
        return trimmed.replace(/^at\s+/, '');
      }
    }

    // Nếu không tìm thấy dòng trong src/, lấy dòng thứ 2 (dòng stack đầu tiên)
    if (lines.length > 1) {
      return lines[1].trim().replace(/^at\s+/, '');
    }

    return error.name || 'GeneralError';
  }

  /**
   * Định dạng toàn bộ StackTrace thành chuỗi an toàn để lưu vào Database
   */
  static extractStackTrace(error: any): string {
    if (!error) {
      return '';
    }

    if (error.stack && typeof error.stack === 'string') {
      return error.stack;
    }

    if (typeof error === 'object') {
      try {
        return JSON.stringify(error, null, 2);
      } catch {
        return String(error);
      }
    }

    return String(error);
  }
}
