import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { TokenCleanupScheduler } from './services/token-cleanup.scheduler';
import { JwtHelper } from '../../helpers/jwt.helper';
import { CookieHelper } from '../../helpers/cookie.helper';
import { RateLimiterHelper } from '../../helpers/rate-limiter.helper';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenCleanupScheduler,
    JwtHelper,
    CookieHelper,
    RateLimiterHelper,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    JwtHelper,
    CookieHelper,
    RateLimiterHelper,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
