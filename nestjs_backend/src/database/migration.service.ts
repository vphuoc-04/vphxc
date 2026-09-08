import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SqlHelper } from './sql.helper';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service tự động quản lý và thực thi Database Migrations theo từng Module (Table + Stored Procedures).
 * Ghi nhận lịch sử vào bảng NhatKyTichHop trên MySQL Database vphxc với Charset utf8mb4 và Collation utf8mb4_0900_ai_ci.
 */
@Injectable()
export class MigrationService implements OnModuleInit {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly sqlHelper: SqlHelper) {}

  async onModuleInit() {
    await this.runMigrations();
  }

  /**
   * Khởi chạy kiểm tra và thực thi các file migrations
   */
  async runMigrations(): Promise<void> {
    const pool = this.sqlHelper.getPool();
    if (!pool) {
      this.logger.warn('MySQL Pool chưa sẵn sàng, hoãn thực thi migrations.');
      return;
    }

    try {
      // 1. Tự động khởi tạo bảng NhatKyTichHop nếu chưa tồn tại
      await this.ensureMigrationTableExists();

      // 2. Lấy danh sách các file migration trong thư mục migrations
      const migrationFiles = this.getMigrationFiles();
      if (migrationFiles.length === 0) {
        this.logger.log('Không tìm thấy file migration nào.');
        return;
      }

      // 3. Lấy danh sách các file đã thực thi trước đó từ bảng NhatKyTichHop
      const executedFiles = await this.getExecutedMigrationFiles();

      // 4. Lọc và thực thi tuần tự các migration chưa chạy
      for (const file of migrationFiles) {
        if (!executedFiles.includes(file.name)) {
          await this.executeMigrationFile(file.name, file.fullPath);
        } else {
          this.logger.debug(
            `Migration [${file.name}] đã chạy trước đó. Bỏ qua.`,
          );
        }
      }

      this.logger.log('Hoàn tất kiểm tra và đồng bộ Database Migrations.');
    } catch (error: any) {
      this.logger.error(
        `Lỗi trong quá trình chạy Database Migrations: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Tạo bảng NhatKyTichHop (với charset utf8mb4 và collation utf8mb4_0900_ai_ci)
   */
  private async ensureMigrationTableExists(): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS NhatKyTichHop (
          Ma_Tich_Hop         INT AUTO_INCREMENT PRIMARY KEY,
          Ten_File_Migration  VARCHAR(255) NOT NULL UNIQUE,
          Tong_Thoi_Gian_Ms   INT NOT NULL DEFAULT 0,
          Trang_Thai          VARCHAR(30) NOT NULL DEFAULT 'THANH_CONG',
          Ghi_Chu             TEXT NULL,
          Ngay_Chay           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `;
    await this.sqlHelper.rawQuery(ddl);
    this.logger.log('Đã đảm bảo bảng quản lý migration sẵn sàng.');
  }

  /**
   * Lấy danh sách các file SQL migration được sắp xếp theo tên
   */
  private getMigrationFiles(): { name: string; fullPath: string }[] {
    const possibleDirs = [
      path.join(__dirname, 'migrations'),
      path.join(process.cwd(), 'src', 'database', 'migrations'),
      path.join(process.cwd(), 'dist', 'database', 'migrations'),
    ];

    let migrationDir = '';
    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        migrationDir = dir;
        break;
      }
    }

    if (!migrationDir) {
      this.logger.warn(
        `Không tìm thấy thư mục migrations trong: ${possibleDirs.join(', ')}`,
      );
      return [];
    }

    const files = fs.readdirSync(migrationDir);
    return files
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b))
      .map((f) => ({
        name: f,
        fullPath: path.join(migrationDir, f),
      }));
  }

  /**
   * Truy vấn danh sách tên các file migration đã thực thi thành công
   */
  private async getExecutedMigrationFiles(): Promise<string[]> {
    try {
      const rows = await this.sqlHelper.rawQuery<any[]>(
        'SELECT Ten_File_Migration FROM NhatKyTichHop WHERE Trang_Thai = ?',
        ['THANH_CONG'],
      );
      return rows.map((r) => r.Ten_File_Migration);
    } catch {
      return [];
    }
  }

  /**
   * Thực thi nội dung 1 file migration và ghi nhận kết quả vào NhatKyTichHop
   */
  private async executeMigrationFile(
    fileName: string,
    filePath: string,
  ): Promise<void> {
    this.logger.log(`Bắt đầu thực thi migration: [${fileName}]...`);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');

    const startTime = Date.now();
    try {
      // Thực thi nội dung file SQL (hỗ trợ nhiều câu lệnh nhờ multipleStatements: true)
      await this.sqlHelper.rawQuery(sqlContent);
      const executionTimeMs = Date.now() - startTime;

      // Ghi nhận vào bảng NhatKyTichHop
      await this.sqlHelper.rawQuery(
        'INSERT INTO NhatKyTichHop (Ten_File_Migration, Tong_Thoi_Gian_Ms, Trang_Thai, Ghi_Chu, Ngay_Chay) VALUES (?, ?, ?, ?, NOW())',
        [
          fileName,
          executionTimeMs,
          'THANH_CONG',
          'Thực thi thành công qua MigrationService',
        ],
      );

      this.logger.log(
        `Thực thi thành công migration [${fileName}] trong ${executionTimeMs}ms.`,
      );
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      this.logger.error(
        `Thất bại khi chạy migration [${fileName}]: ${error.message}`,
        error.stack,
      );

      try {
        await this.sqlHelper.rawQuery(
          'INSERT INTO NhatKyTichHop (Ten_File_Migration, Tong_Thoi_Gian_Ms, Trang_Thai, Ghi_Chu, Ngay_Chay) VALUES (?, ?, ?, ?, NOW())',
          [fileName, executionTimeMs, 'THAT_BAI', error.message],
        );
      } catch (logErr: any) {
        this.logger.warn(
          `Không thể ghi log lỗi vào NhatKyTichHop: ${logErr.message}`,
        );
      }

      throw error;
    }
  }
}
