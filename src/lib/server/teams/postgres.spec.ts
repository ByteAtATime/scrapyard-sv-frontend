import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresTeamsRepo } from './postgres';
import { teamsTable, teamMembersTable } from '../db/schema';
import type { TeamData, TeamMemberData, UserData } from '../db/types';
import { SQL } from 'drizzle-orm';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

vi.mock('$lib/server/db', () => ({
	db: mockDb
}));

describe('PostgresTeamsRepo', () => {
	let repository: PostgresTeamsRepo;

	beforeEach(() => {
		repository = new PostgresTeamsRepo();
		mockDb.select.mockReturnValue(mockDb);
		mockDb.from.mockReturnValue(mockDb);
		mockDb.where.mockReturnValue(mockDb);
		mockDb.orderBy.mockReturnValue(mockDb);
		mockDb.innerJoin.mockReturnValue(mockDb);
		mockDb.insert.mockReturnValue(mockDb);
		mockDb.values.mockReturnValue(mockDb);
		mockDb.returning.mockReturnValue(mockDb);
		mockDb.update.mockReturnValue(mockDb);
		mockDb.set.mockReturnValue(mockDb);
		mockDb.delete.mockReturnValue(mockDb);
		vi.clearAllMocks();
	});

	describe('createTeam', () => {
		it('should create team and return it', async () => {
			const mockTeam = { id: 1, name: 'Test Team' } as TeamData;
			mockDb.returning.mockResolvedValueOnce([mockTeam]);

			const result = await repository.createTeam({
				name: 'Test Team',
				description: 'Test Description'
			});

			expect(result).toEqual(mockTeam);
			expect(mockDb.insert).toHaveBeenCalledWith(teamsTable);
			expect(mockDb.values).toHaveBeenCalledWith({
				name: 'Test Team',
				description: 'Test Description'
			});
		});
	});

	describe('updateTeam', () => {
		it('should update team and return it', async () => {
			const mockTeam = { id: 1, name: 'Updated Team' } as TeamData;
			mockDb.returning.mockResolvedValueOnce([mockTeam]);

			const result = await repository.updateTeam(1, {
				name: 'Updated Team'
			});

			expect(result).toEqual(mockTeam);
			expect(mockDb.update).toHaveBeenCalledWith(teamsTable);
			expect(mockDb.set).toHaveBeenCalledWith({
				name: 'Updated Team',
				updatedAt: expect.any(Date)
			});
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});
	});

	describe('deleteTeam', () => {
		it('should delete team and its members', async () => {
			await repository.deleteTeam(1);

			expect(mockDb.delete).toHaveBeenCalledWith(teamMembersTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
			expect(mockDb.delete).toHaveBeenCalledWith(teamsTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});
	});

	describe('getTeamById', () => {
		it('should return team with members when found', async () => {
			const mockTeam = { id: 1, name: 'Test Team' } as TeamData;
			const mockMembers = [
				{
					teamId: 1,
					userId: 1,
					role: 'leader',
					user: {
						id: 1,
						name: 'Test User',
						email: 'test@example.com',
						authProvider: 'clerk',
						authProviderId: 'test',
						isOrganizer: false
					} as UserData
				}
			] as (TeamMemberData & { user: UserData })[];

			mockDb.where.mockResolvedValueOnce([mockTeam]);
			mockDb.where.mockResolvedValueOnce(mockMembers);

			const result = await repository.getTeamById(1);

			expect(result).toEqual({
				...mockTeam,
				members: mockMembers
			});
			expect(mockDb.select).toHaveBeenCalledWith();
			expect(mockDb.from).toHaveBeenCalledWith(teamsTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});

		it('should return null when team not found', async () => {
			mockDb.where.mockResolvedValueOnce([]);

			const result = await repository.getTeamById(999);

			expect(result).toBeNull();
			expect(mockDb.select).toHaveBeenCalledWith();
			expect(mockDb.from).toHaveBeenCalledWith(teamsTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});

		it('should use cache when available', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				members: []
			};

			// First call - cache miss
			mockDb.where.mockResolvedValueOnce([mockTeam]);
			mockDb.where.mockResolvedValueOnce([]);
			await repository.getTeamById(1);

			// Second call - should use cache
			const result = await repository.getTeamById(1);

			expect(result).toEqual(mockTeam);
			expect(mockDb.select).toHaveBeenCalledTimes(2); // Only from first call
		});
	});

	describe('getTeams', () => {
		it('should return all teams', async () => {
			const mockTeams = [{ id: 1, name: 'Test Team' }] as TeamData[];
			mockDb.from.mockResolvedValueOnce(mockTeams);

			const result = await repository.getTeams();

			expect(result).toEqual(mockTeams);
			expect(mockDb.select).toHaveBeenCalledWith();
			expect(mockDb.from).toHaveBeenCalledWith(teamsTable);
		});
	});

	describe('getTeamsByUserId', () => {
		it('should return user teams', async () => {
			const mockTeams = [{ id: 1, name: 'Test Team' }] as TeamData[];
			mockDb.where.mockResolvedValueOnce(mockTeams);

			const result = await repository.getTeamsByUserId(1);

			expect(result).toEqual(mockTeams);
			expect(mockDb.select).toHaveBeenCalledWith({
				id: teamsTable.id,
				name: teamsTable.name,
				description: teamsTable.description,
				createdAt: teamsTable.createdAt,
				updatedAt: teamsTable.updatedAt
			});
			expect(mockDb.from).toHaveBeenCalledWith(teamsTable);
			expect(mockDb.innerJoin).toHaveBeenCalledWith(teamMembersTable, expect.any(SQL));
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});

		it('should use cache when available', async () => {
			const mockTeams = [{ id: 1, name: 'Test Team' }] as TeamData[];

			// First call - cache miss
			mockDb.where.mockResolvedValueOnce(mockTeams);
			await repository.getTeamsByUserId(1);

			// Second call - should use cache
			const result = await repository.getTeamsByUserId(1);

			expect(result).toEqual(mockTeams);
			expect(mockDb.select).toHaveBeenCalledTimes(1); // Only from first call
		});
	});

	describe('addTeamMember', () => {
		it('should add team member and return it', async () => {
			const mockMember = { teamId: 1, userId: 1, role: 'member' } as TeamMemberData;
			mockDb.returning.mockResolvedValueOnce([mockMember]);

			const result = await repository.addTeamMember(1, {
				userId: 1,
				role: 'member'
			});

			expect(result).toEqual(mockMember);
			expect(mockDb.insert).toHaveBeenCalledWith(teamMembersTable);
			expect(mockDb.values).toHaveBeenCalledWith({
				teamId: 1,
				userId: 1,
				role: 'member'
			});
		});
	});

	describe('removeTeamMember', () => {
		it('should remove team member', async () => {
			await repository.removeTeamMember(1, 1);

			expect(mockDb.delete).toHaveBeenCalledWith(teamMembersTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});
	});

	describe('updateTeamMemberRole', () => {
		it('should update team member role and return it', async () => {
			const mockMember = { teamId: 1, userId: 1, role: 'leader' } as TeamMemberData;
			mockDb.returning.mockResolvedValueOnce([mockMember]);

			const result = await repository.updateTeamMemberRole(1, 1, 'leader');

			expect(result).toEqual(mockMember);
			expect(mockDb.update).toHaveBeenCalledWith(teamMembersTable);
			expect(mockDb.set).toHaveBeenCalledWith({ role: 'leader' });
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});
	});

	describe('getTeamMembers', () => {
		it('should return team members', async () => {
			const mockMembers = [{ teamId: 1, userId: 1, role: 'member' }] as TeamMemberData[];
			mockDb.where.mockResolvedValueOnce(mockMembers);

			const result = await repository.getTeamMembers(1);

			expect(result).toEqual(mockMembers);
			expect(mockDb.select).toHaveBeenCalledWith();
			expect(mockDb.from).toHaveBeenCalledWith(teamMembersTable);
			expect(mockDb.where).toHaveBeenCalledWith(expect.any(SQL));
		});
	});
});
