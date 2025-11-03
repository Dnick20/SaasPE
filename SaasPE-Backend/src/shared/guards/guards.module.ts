import { Module } from '@nestjs/common';
import { TierLimitGuard } from './tier-limit.guard';
import { DatabaseModule } from '../database/database.module';

/**
 * Shared Guards Module
 *
 * Provides common guards used across the application:
 * - TierLimitGuard: Enforces subscription tier limits
 *
 * Usage:
 * ```ts
 * @Module({
 *   imports: [GuardsModule],
 *   // ...
 * })
 * export class YourModule {}
 * ```
 */
@Module({
  imports: [DatabaseModule],
  providers: [TierLimitGuard],
  exports: [TierLimitGuard],
})
export class GuardsModule {}
