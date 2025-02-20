export * from './types';
export * from './service';
export * from './postgres';

import { PostgresTeamsRepo } from './postgres';
import { TeamsService } from './service';

export const teamsRepo = new PostgresTeamsRepo();
export const teamsService = new TeamsService(teamsRepo);
