import { Module } from '@nestjs/common';
import { InvitationService } from './invitation.service.js';
import {
  MemberController,
  MyInvitationController,
} from './member.controller.js';
import { MemberService } from './member.service.js';
import { WorkspaceController } from './workspace.controller.js';
import { WorkspacePermissionGuard } from './workspace-permission.guard.js';
import { WorkspaceService } from './workspace.service.js';

@Module({
  controllers: [WorkspaceController, MemberController, MyInvitationController],
  providers: [
    WorkspaceService,
    MemberService,
    InvitationService,
    WorkspacePermissionGuard,
  ],
  exports: [WorkspacePermissionGuard],
})
export class WorkspaceModule {}
