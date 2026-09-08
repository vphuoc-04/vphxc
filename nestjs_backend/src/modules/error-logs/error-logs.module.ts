import { Module } from '@nestjs/common';
import { ErrorLogsController } from './controllers/error-logs.controller';
import { ErrorLogService } from './services/error-log.service';

@Module({
  controllers: [ErrorLogsController],
  providers: [ErrorLogService],
  exports: [ErrorLogService],
})
export class ErrorLogsModule {}
