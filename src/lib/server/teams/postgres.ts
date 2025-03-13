import { db } from '$lib/server/db';
import { teamsTable, teamMembersTable, usersTable, teamInvitationsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type {
	ITeamsRepo,
	CreateTeamData,
	UpdateTeamData,
	AddTeamMemberData,
	CreateTeamInvitationData,
	TeamInvitationData,
	TeamInvitationWithTeamData
} from './types';
import type { TeamData, TeamMemberData, TeamWithMembersData, UserData } from '../db/types';
import { Logger } from '../logging';
import { Cache } from '../cache';

export class PostgresTeamsRepo implements ITeamsRepo {
	private static TTL_MS = 5000; // 5 seconds
	private teamCache = new Cache<number, TeamWithMembersData>(PostgresTeamsRepo.TTL_MS);
	private userTeamsCache = new Cache<number, TeamData[]>(PostgresTeamsRepo.TTL_MS);
	private logger = new Logger('TeamsRepo');

	async createTeam(data: CreateTeamData): Promise<TeamData> {
		this.logger.info('Creating team', { name: data.name });
		const [team] = await db.insert(teamsTable).values(data).returning();
		return team;
	}

	async updateTeam(teamId: number, data: UpdateTeamData): Promise<TeamData> {
		this.logger.info('Updating team', { teamId });
		const [team] = await db
			.update(teamsTable)
			.set({
				...data,
				updatedAt: new Date()
			})
			.where(eq(teamsTable.id, teamId))
			.returning();

		this.teamCache.delete(teamId);
		return team;
	}

	async deleteTeam(teamId: number): Promise<void> {
		this.logger.info('Deleting team', { teamId });
		await db.delete(teamMembersTable).where(eq(teamMembersTable.teamId, teamId));
		await db.delete(teamInvitationsTable).where(eq(teamInvitationsTable.teamId, teamId));
		await db.delete(teamsTable).where(eq(teamsTable.id, teamId));
		this.teamCache.delete(teamId);
	}

	async getTeamById(teamId: number): Promise<TeamWithMembersData | null> {
		const cached = this.teamCache.get(teamId);
		if (cached !== undefined) {
			this.logger.debug('Cache hit: getTeamById', { teamId });
			return cached;
		}

		this.logger.debug('Cache miss: getTeamById', { teamId });
		const teams = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
		if (teams.length === 0) return null;

		const team = teams[0];
		const members = await this.getTeamMembersWithUsers(teamId);
		const teamWithMembers: TeamWithMembersData = {
			...team,
			members
		};

		this.teamCache.set(teamId, teamWithMembers);
		return teamWithMembers;
	}

	async getTeams(): Promise<TeamData[]> {
		return await db.select().from(teamsTable);
	}

	async getTeamsByUserId(userId: number): Promise<TeamData[]> {
		const cached = this.userTeamsCache.get(userId);
		if (cached !== undefined) {
			this.logger.debug('Cache hit: getTeamsByUserId', { userId });
			return cached;
		}

		this.logger.debug('Cache miss: getTeamsByUserId', { userId });
		const teams = await db
			.select({
				id: teamsTable.id,
				name: teamsTable.name,
				description: teamsTable.description,
				createdAt: teamsTable.createdAt,
				updatedAt: teamsTable.updatedAt
			})
			.from(teamsTable)
			.innerJoin(teamMembersTable, eq(teamMembersTable.teamId, teamsTable.id))
			.where(eq(teamMembersTable.userId, userId));

		this.userTeamsCache.set(userId, teams);
		return teams;
	}

	async addTeamMember(teamId: number, data: AddTeamMemberData): Promise<TeamMemberData> {
		this.logger.info('Adding team member', { teamId, userId: data.userId });
		const [member] = await db
			.insert(teamMembersTable)
			.values({
				teamId,
				userId: data.userId,
				role: data.role
			})
			.returning();

		this.teamCache.delete(teamId);
		this.userTeamsCache.delete(data.userId);
		return member;
	}

	async removeTeamMember(teamId: number, userId: number): Promise<void> {
		this.logger.info('Removing team member', { teamId, userId });
		await db
			.delete(teamMembersTable)
			.where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, userId)));

		this.teamCache.delete(teamId);
		this.userTeamsCache.delete(userId);
	}

	async updateTeamMemberRole(
		teamId: number,
		userId: number,
		role: 'member' | 'leader'
	): Promise<TeamMemberData> {
		this.logger.info('Updating team member role', { teamId, userId, role });
		const [member] = await db
			.update(teamMembersTable)
			.set({ role })
			.where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, userId)))
			.returning();

		this.teamCache.delete(teamId);
		return member;
	}

	async getTeamMembers(teamId: number): Promise<TeamMemberData[]> {
		return await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, teamId));
	}

	private async getTeamMembersWithUsers(
		teamId: number
	): Promise<(TeamMemberData & { user: UserData })[]> {
		return await db
			.select({
				teamId: teamMembersTable.teamId,
				userId: teamMembersTable.userId,
				role: teamMembersTable.role,
				joinedAt: teamMembersTable.joinedAt,
				user: {
					id: usersTable.id,
					name: usersTable.name,
					email: usersTable.email,
					authProvider: usersTable.authProvider,
					authProviderId: usersTable.authProviderId,
					isOrganizer: usersTable.isOrganizer,
					avatarUrl: usersTable.avatarUrl
				}
			})
			.from(teamMembersTable)
			.innerJoin(usersTable, eq(teamMembersTable.userId, usersTable.id))
			.where(eq(teamMembersTable.teamId, teamId));
	}

	async createTeamInvitation(data: CreateTeamInvitationData): Promise<TeamInvitationData> {
		this.logger.info('Creating team invitation', { teamId: data.teamId, userId: data.userId });
		const [invitation] = await db.insert(teamInvitationsTable).values(data).returning();
		return invitation;
	}

	async getTeamInvitationById(invitationId: number): Promise<TeamInvitationData | null> {
		const invitations = await db
			.select()
			.from(teamInvitationsTable)
			.where(eq(teamInvitationsTable.id, invitationId));
		return invitations[0] ?? null;
	}

	async getTeamInvitationsByUserId(userId: number): Promise<TeamInvitationWithTeamData[]> {
		return await db
			.select({
				id: teamInvitationsTable.id,
				teamId: teamInvitationsTable.teamId,
				userId: teamInvitationsTable.userId,
				invitedBy: teamInvitationsTable.invitedBy,
				status: teamInvitationsTable.status,
				createdAt: teamInvitationsTable.createdAt,
				updatedAt: teamInvitationsTable.updatedAt,
				responseAt: teamInvitationsTable.responseAt,
				team: {
					id: teamsTable.id,
					name: teamsTable.name,
					description: teamsTable.description,
					createdAt: teamsTable.createdAt,
					updatedAt: teamsTable.updatedAt
				}
			})
			.from(teamInvitationsTable)
			.innerJoin(teamsTable, eq(teamInvitationsTable.teamId, teamsTable.id))
			.where(eq(teamInvitationsTable.userId, userId));
	}

	async getTeamInvitationsByTeamId(teamId: number): Promise<TeamInvitationData[]> {
		return await db
			.select()
			.from(teamInvitationsTable)
			.where(eq(teamInvitationsTable.teamId, teamId));
	}

	async acceptTeamInvitation(invitationId: number): Promise<TeamInvitationData> {
		const [invitation] = await db
			.update(teamInvitationsTable)
			.set({
				status: 'accepted',
				responseAt: new Date(),
				updatedAt: new Date()
			})
			.where(eq(teamInvitationsTable.id, invitationId))
			.returning();
		return invitation;
	}

	async rejectTeamInvitation(invitationId: number): Promise<TeamInvitationData> {
		const [invitation] = await db
			.update(teamInvitationsTable)
			.set({
				status: 'rejected',
				responseAt: new Date(),
				updatedAt: new Date()
			})
			.where(eq(teamInvitationsTable.id, invitationId))
			.returning();
		return invitation;
	}

	async cancelTeamInvitation(invitationId: number): Promise<TeamInvitationData> {
		const [invitation] = await db
			.update(teamInvitationsTable)
			.set({
				status: 'cancelled',
				responseAt: new Date(),
				updatedAt: new Date()
			})
			.where(eq(teamInvitationsTable.id, invitationId))
			.returning();
		return invitation;
	}
}
