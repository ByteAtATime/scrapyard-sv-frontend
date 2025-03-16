import type {
	ITeamsService,
	ITeamsRepo,
	CreateTeamData,
	UpdateTeamData,
	AddTeamMemberData,
	TeamInvitationData,
	TeamInvitationWithTeamData
} from './types';
import type { TeamData, TeamMemberData, TeamWithMembersData } from '../db/types';
import { TEAM_CONFIG } from './config';

export class TeamsService implements ITeamsService {
	constructor(private readonly repository: ITeamsRepo) {}

	async isUserInTeam(userId: number, teamId: number): Promise<boolean> {
		const team = await this.getTeamById(teamId);
		if (!team) {
			return false;
		}
		return team.members.some((member) => member.userId === userId);
	}

	async teamExists(teamId: number): Promise<boolean> {
		const team = await this.getTeamById(teamId);
		return !!team;
	}

	async createTeam(data: CreateTeamData): Promise<TeamData> {
		return await this.repository.createTeam(data);
	}

	async updateTeam(teamId: number, data: UpdateTeamData): Promise<TeamData> {
		return await this.repository.updateTeam(teamId, data);
	}

	async deleteTeam(teamId: number): Promise<void> {
		await this.repository.deleteTeam(teamId);
	}

	async getTeamById(teamId: number): Promise<TeamWithMembersData | null> {
		return await this.repository.getTeamById(teamId);
	}

	async getTeams(): Promise<TeamData[]> {
		return await this.repository.getTeams();
	}

	async getTeamsByUserId(userId: number): Promise<TeamData[]> {
		return await this.repository.getTeamsByUserId(userId);
	}

	async addTeamMember(teamId: number, data: AddTeamMemberData): Promise<TeamMemberData> {
		const team = await this.getTeamById(teamId);
		if (!team) {
			throw new Error('Team not found');
		}

		if (team.members.length >= TEAM_CONFIG.MAX_MEMBERS) {
			throw new Error(`Team cannot have more than ${TEAM_CONFIG.MAX_MEMBERS} members`);
		}

		// Check if user is already in the team
		const existingMember = team.members.find((member) => member.userId === data.userId);
		if (existingMember) {
			throw new Error('User is already a member of this team');
		}

		// Check if user is already in another team
		const userTeams = await this.getTeamsByUserId(data.userId);
		if (userTeams.length > 0) {
			throw new Error('User is already a member of another team');
		}

		// If this is the first member, make them the leader
		if (team.members.length === 0) {
			data.role = 'leader';
		}

		return await this.repository.addTeamMember(teamId, data);
	}

	async removeTeamMember(teamId: number, userId: number): Promise<void> {
		const team = await this.getTeamById(teamId);
		if (!team) {
			throw new Error('Team not found');
		}

		// Don't allow removing the last leader
		const member = team.members.find((m) => m.userId === userId);
		if (member?.role === 'leader' && team.members.filter((m) => m.role === 'leader').length === 1) {
			throw new Error('Cannot remove the last team leader');
		}

		await this.repository.removeTeamMember(teamId, userId);
	}

	async updateTeamMemberRole(
		teamId: number,
		userId: number,
		role: 'member' | 'leader'
	): Promise<TeamMemberData> {
		const team = await this.getTeamById(teamId);
		if (!team) {
			throw new Error('Team not found');
		}

		// Don't allow removing the last leader
		if (role === 'member') {
			const member = team.members.find((m) => m.userId === userId);
			if (
				member?.role === 'leader' &&
				team.members.filter((m) => m.role === 'leader').length === 1
			) {
				throw new Error('Cannot demote the last team leader');
			}
		}

		return await this.repository.updateTeamMemberRole(teamId, userId, role);
	}

	async getTeamMembers(teamId: number): Promise<TeamMemberData[]> {
		return await this.repository.getTeamMembers(teamId);
	}

	async inviteToTeam(
		teamId: number,
		userId: number,
		invitedBy: number
	): Promise<TeamInvitationData> {
		const team = await this.getTeamById(teamId);
		if (!team) {
			throw new Error('Team not found');
		}

		// Check if team is full
		if (team.members.length >= TEAM_CONFIG.MAX_MEMBERS) {
			throw new Error(`Team cannot have more than ${TEAM_CONFIG.MAX_MEMBERS} members`);
		}

		// Check if user is already in a team
		const userTeams = await this.getTeamsByUserId(userId);
		if (userTeams.length > 0) {
			throw new Error('User is already a member of a team');
		}

		// Check if user already has a pending invitation to this team
		const teamInvitations = await this.repository.getTeamInvitationsByTeamId(teamId);
		const existingInvitation = teamInvitations.find(
			(invitation) => invitation.userId === userId && invitation.status === 'pending'
		);
		if (existingInvitation) {
			throw new Error('User already has a pending invitation to this team');
		}

		// Create the invitation
		return await this.repository.createTeamInvitation({
			teamId,
			userId,
			invitedBy
		});
	}

	async getTeamInvitationById(invitationId: number): Promise<TeamInvitationData | null> {
		return await this.repository.getTeamInvitationById(invitationId);
	}

	async getTeamInvitationsByUserId(userId: number): Promise<TeamInvitationWithTeamData[]> {
		return await this.repository.getTeamInvitationsByUserId(userId);
	}

	async getTeamInvitationsByTeamId(teamId: number): Promise<TeamInvitationData[]> {
		return await this.repository.getTeamInvitationsByTeamId(teamId);
	}

	async acceptTeamInvitation(invitationId: number): Promise<TeamInvitationData> {
		const invitation = await this.getTeamInvitationById(invitationId);
		if (!invitation) {
			throw new Error('Invitation not found');
		}

		if (invitation.status !== 'pending') {
			throw new Error('Invitation is not pending');
		}

		// Check if user is already in a team
		const userTeams = await this.getTeamsByUserId(invitation.userId);
		if (userTeams.length > 0) {
			throw new Error('User is already a member of a team');
		}

		// Check if team is full
		const team = await this.getTeamById(invitation.teamId);
		if (!team) {
			throw new Error('Team not found');
		}

		if (team.members.length >= TEAM_CONFIG.MAX_MEMBERS) {
			throw new Error(`Team cannot have more than ${TEAM_CONFIG.MAX_MEMBERS} members`);
		}

		// Add user to team
		await this.addTeamMember(invitation.teamId, {
			userId: invitation.userId,
			role: 'member'
		});

		// Update invitation status
		return await this.repository.acceptTeamInvitation(invitationId);
	}

	async rejectTeamInvitation(invitationId: number): Promise<TeamInvitationData> {
		const invitation = await this.getTeamInvitationById(invitationId);
		if (!invitation) {
			throw new Error('Invitation not found');
		}

		if (invitation.status !== 'pending') {
			throw new Error('Invitation is not pending');
		}

		return await this.repository.rejectTeamInvitation(invitationId);
	}

	async cancelTeamInvitation(invitationId: number): Promise<TeamInvitationData> {
		const invitation = await this.getTeamInvitationById(invitationId);
		if (!invitation) {
			throw new Error('Invitation not found');
		}

		if (invitation.status !== 'pending') {
			throw new Error('Invitation is not pending');
		}

		return await this.repository.cancelTeamInvitation(invitationId);
	}
}
