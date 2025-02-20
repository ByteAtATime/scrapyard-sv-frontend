import { vi } from 'vitest';
import type { ITeamsRepo } from './types';

export class MockTeamsRepo implements ITeamsRepo {
	createTeam = vi.fn();
	updateTeam = vi.fn();
	deleteTeam = vi.fn();
	getTeamById = vi.fn();
	getTeams = vi.fn();
	getTeamsByUserId = vi.fn();
	addTeamMember = vi.fn();
	removeTeamMember = vi.fn();
	updateTeamMemberRole = vi.fn();
	getTeamMembers = vi.fn();
	createTeamInvitation = vi.fn();
	getTeamInvitationById = vi.fn();
	getTeamInvitationsByUserId = vi.fn();
	getTeamInvitationsByTeamId = vi.fn();
	acceptTeamInvitation = vi.fn();
	rejectTeamInvitation = vi.fn();
	cancelTeamInvitation = vi.fn();
}
