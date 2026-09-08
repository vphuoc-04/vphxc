import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  charset: string;
  collation: string;
  timezone: string;
  poolLimit: number;
  queueLimit: number;
  connectionTimeout: number;
  idleTimeout: number;
  enableMultipleStatements: boolean;
}

/**
 * Trình thực thi Stored Procedures MySQL tối ưu và toàn năng.
 * Quản lý Connection Pool, thực thi CALL Stored Procedures với tham số, và map ResultSet.
 */
@Injectable()
export class SqlHelper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqlHelper.name);
  private pool!: mysql.Pool;
  private databaseName!: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const dbConfig = this.configService.get<DatabaseConfig>('database')!;
    this.databaseName = dbConfig.database;

    this.pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      charset: dbConfig.charset,
      timezone: dbConfig.timezone,
      waitForConnections: true,
      connectionLimit: dbConfig.poolLimit,
      queueLimit: dbConfig.queueLimit,
      multipleStatements: dbConfig.enableMultipleStatements,
      namedPlaceholders: false,
    });

    try {
      const connection = await this.pool.getConnection();
      this.logger.log(
        `Đã kết nối thành công MySQL Database Pool: [${this.databaseName}] tại ${dbConfig.host}:${dbConfig.port} (Charset: ${dbConfig.charset})`,
      );
      connection.release();
    } catch (error: any) {
      this.logger.error(
        `Không thể kết nối tới MySQL Database: ${error.message}`,
        error.stack,
      );
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Đã đóng MySQL Connection Pool.');
    }
  }

  /**
   * Lấy instance MySQL Pool gốc
   */
  getPool(): mysql.Pool {
    return this.pool;
  }

  /**
   * Tên CSDL hiện tại
   */
  getDatabaseName(): string {
    return this.databaseName;
  }

  /**
   * Thực thi Stored Procedure và trả về danh sách các dòng (ResultSet đầu tiên)
   */
  async queryForList<T = any>(
    procedureName: string,
    params: any[] = [],
  ): Promise<T[]> {
    const placeholders = params.map(() => '?').join(', ');
    const sql = `CALL ${procedureName}(${placeholders})`;

    try {
      const [results] = await this.pool.query(sql, params);
      if (Array.isArray(results) && results.length > 0) {
        const firstResultSet = results[0];
        if (Array.isArray(firstResultSet)) {
          return firstResultSet as T[];
        }
      }
      return [];
    } catch (error: any) {
      this.logger.error(
        `Lỗi khi thực thi SP [${procedureName}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Thực thi Stored Procedure và trả về 1 bản ghi duy nhất
   */
  async queryForObject<T = any>(
    procedureName: string,
    params: any[] = [],
  ): Promise<T | null> {
    const list = await this.queryForList<T>(procedureName, params);
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Thực thi Stored Procedure thao tác ghi/cập nhật hoặc không yêu cầu lấy dữ liệu trả về
   */
  async execute(procedureName: string, params: any[] = []): Promise<any> {
    const placeholders = params.map(() => '?').join(', ');
    const sql = `CALL ${procedureName}(${placeholders})`;

    try {
      const [results] = await this.pool.query(sql, params);
      return results;
    } catch (error: any) {
      this.logger.error(
        `Lỗi khi thực thi execute SP [${procedureName}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Thực thi câu lệnh SQL trực tiếp (Raw Query)
   */
  async rawQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
    try {
      const [results] = await this.pool.query(sql, params);
      return results as T;
    } catch (error: any) {
      this.logger.error(`Lỗi thực thi raw SQL: ${error.message}`, error.stack);
      throw error;
    }
  }
}
