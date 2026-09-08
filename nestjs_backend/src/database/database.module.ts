import { Module, Global } from '@nestjs/common';
import { SqlHelper } from './sql.helper';
import { MigrationService } from './migration.service';

@Global()
@Module({
  providers: [SqlHelper, MigrationService],
  exports: [SqlHelper, MigrationService],
})
export class DatabaseModule {}
