import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';
import {
  RoleController,
  SkillController,
  TeamController,
  WorkspaceTeamController,
} from './team.controller.js';
import { TeamService } from './team.service.js';

@Module({
  controllers: [
    WorkspaceTeamController,
    TeamController,
    RoleController,
    SkillController,
  ],
  providers: [TeamService, CatalogService],
})
export class TeamModule {}
