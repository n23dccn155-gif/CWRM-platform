import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard.js';
import { AuditModule } from './audit/audit.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CapacityModule } from './capacity/capacity.module.js';
import { ClockModule } from './common/clock.js';
import { AppConfigModule } from './config/app-config.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TaskModule } from './task/task.module.js';
import { TeamModule } from './team/team.module.js';
import { WorkspaceModule } from './workspace/workspace.module.js';
import { WorkspacePermissionGuard } from './workspace/workspace-permission.guard.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ClockModule,
    AuditModule,
    AuthModule,
    WorkspaceModule,
    TeamModule,
    CapacityModule,
    TaskModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: WorkspacePermissionGuard },
  ],
})
export class AppModule {}
