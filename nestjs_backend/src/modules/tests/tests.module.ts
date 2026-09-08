import { Module } from '@nestjs/common';
import { TestsController } from './controllers/tests.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ErrorLogsModule } from '../error-logs/error-logs.module';

@Module({
  imports: [AuditLogsModule, ErrorLogsModule],
  controllers: [TestsController],
})
export class TestsModule {}
