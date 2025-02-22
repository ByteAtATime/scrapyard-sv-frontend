import { describe, it, expect, beforeEach } from 'vitest';
import { PostgresTeamsRepo } from './postgres';
import { teamsTable, teamMembersTable, teamInvitationsTable, usersTable } from '../db/schema';
import type { TeamData, TeamMemberData } from '../db/types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';

describe('PostgresTeamsRepo', () => {
	let repository: PostgresTeamsRepo;

	// Helper function to create a user
	const createUser = async (userId: number, name: string) => {
		await db.insert(usersTable).values({
			id: userId,
			name,
			email: `${name.toLowerCase().replace(/\s/g, '')}@example.com`,
			authProvider: 'clerk',
			authProviderId: `test-id-${userId}`
		});
		return userId;
	};

	// Helper function to create a test team
	const createTestTeam = ({
		id = 1,
		name = 'Test Team',
		description = 'A test team'
	}: Partial<TeamData> = {}): TeamData => {
		return {
			id,
			name,
			description,
			createdAt: new Date(),
			updatedAt: new Date()
		};
	};

	// Helper function to create a test team member
	const createTestTeamMember = ({
		teamId = 1,
		userId = 1,
		role = 'member' as const
	}: Partial<TeamMemberData> = {}): TeamMemberData => {
		return {
			teamId,
			userId,
			role,
			joinedAt: new Date()
		};
	};

	beforeEach(() => {
		repository = new PostgresTeamsRepo();
	});

	describe('createTeam', () => {
		it('should create a new team and return it', async () => {
			// Given: team data is prepared
			const teamData = {
				name: 'New Team',
				description: 'A new test team'
			};

			// When: createTeam is called
			const result = await repository.createTeam(teamData);

			// Then: team should be created with correct data
			expect(result).toMatchObject(teamData);
			expect(result.id).toBeDefined();

			// And: team should be retrievable from database
			const dbTeam = await repository.getTeamById(result.id);
			expect(dbTeam).toMatchObject(teamData);
		});

		it('should create team with minimal data', async () => {
			// Given: minimal team data
			const teamData = { name: 'Minimal Team', description: '' };

			// When: createTeam is called
			const result = await repository.createTeam(teamData);

			// Then: team should be created with default values
			expect(result.name).toBe(teamData.name);
			expect(result.description).toBe('');
		});
	});

	describe('updateTeam', () => {
		it('should update an existing team', async () => {
			// Given: a team exists
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);

			// When: updateTeam is called
			const updates = {
				name: 'Updated Team',
				description: 'Updated description'
			};
			const result = await repository.updateTeam(teamData.id, updates);

			// Then: team should be updated
			expect(result).toMatchObject({
				...teamData,
				...updates,
				updatedAt: expect.any(Date)
			});

			// And: cache should be invalidated
			const updatedTeam = await repository.getTeamById(teamData.id);
			expect(updatedTeam?.name).toBe(updates.name);
		});

		it('should handle partial updates', async () => {
			// Given: a team exists
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);

			// When: updateTeam is called with partial data
			const result = await repository.updateTeam(teamData.id, { name: 'New Name' });

			// Then: only specified fields should be updated
			expect(result.name).toBe('New Name');
			expect(result.description).toBe(teamData.description);
		});
	});

	describe('deleteTeam', () => {
		it('should delete team and all related data', async () => {
			// Given: a team exists with members and invitations
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);

			const userId = await createUser(1, 'Test User');
			await db
				.insert(teamMembersTable)
				.values(createTestTeamMember({ teamId: teamData.id, userId }));
			await db.insert(teamInvitationsTable).values({
				teamId: teamData.id,
				userId,
				invitedBy: userId,
				status: 'pending'
			});

			// When: deleteTeam is called
			await repository.deleteTeam(teamData.id);

			// Then: team should be deleted
			const deletedTeam = await repository.getTeamById(teamData.id);
			expect(deletedTeam).toBeNull();

			// And: all related data should be deleted
			const members = await repository.getTeamMembers(teamData.id);
			expect(members).toHaveLength(0);

			const invitations = await repository.getTeamInvitationsByTeamId(teamData.id);
			expect(invitations).toHaveLength(0);
		});

		it('should not throw when deleting non-existent team', async () => {
			// When/Then: deleteTeam should not throw for non-existent team
			await expect(repository.deleteTeam(999)).resolves.not.toThrow();
		});
	});

	describe('getTeamById', () => {
		it('should return team with members when found', async () => {
			// Given: a team exists with members
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);

			const user1 = await createUser(1, 'User One');
			const user2 = await createUser(2, 'User Two');
			await db
				.insert(teamMembersTable)
				.values([
					createTestTeamMember({ teamId: teamData.id, userId: user1, role: 'leader' }),
					createTestTeamMember({ teamId: teamData.id, userId: user2, role: 'member' })
				]);

			// When: getTeamById is called
			const result = await repository.getTeamById(teamData.id);

			// Then: team with members should be returned
			expect(result).toMatchObject({
				...teamData,
				members: expect.arrayContaining([
					expect.objectContaining({ userId: user1, role: 'leader' }),
					expect.objectContaining({ userId: user2, role: 'member' })
				])
			});
		});

		it('should return null for non-existent team', async () => {
			// When: getTeamById is called with non-existent ID
			const result = await repository.getTeamById(999);

			// Then: null should be returned
			expect(result).toBeNull();
		});

		it('should use cache for subsequent calls', async () => {
			// Given: a team exists
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);

			// When: getTeamById is called multiple times
			const firstCall = await repository.getTeamById(teamData.id);

			// Update team in database
			await db
				.update(teamsTable)
				.set({ name: 'Updated Name' })
				.where(eq(teamsTable.id, teamData.id));

			const secondCall = await repository.getTeamById(teamData.id);

			// Then: second call should return cached data
			expect(secondCall).toEqual(firstCall);
			expect(secondCall?.name).toBe(teamData.name);
		});
	});

	describe('getTeams', () => {
		it('should return all teams', async () => {
			// Given: multiple teams exist
			const teams = [
				createTestTeam({ id: 1, name: 'Team 1' }),
				createTestTeam({ id: 2, name: 'Team 2' })
			];
			await db.insert(teamsTable).values(teams);

			// When: getTeams is called
			const result = await repository.getTeams();

			// Then: all teams should be returned
			expect(result).toHaveLength(2);
			expect(result.map((t) => t.name)).toEqual(['Team 1', 'Team 2']);
		});

		it('should return empty array when no teams exist', async () => {
			// When: getTeams is called with no teams
			const result = await repository.getTeams();

			// Then: empty array should be returned
			expect(result).toEqual([]);
		});
	});

	describe('getTeamsByUserId', () => {
		it('should return teams user is member of', async () => {
			// Given: user is member of multiple teams
			const userId = await createUser(1, 'Test User');
			const teams = [
				createTestTeam({ id: 1, name: 'Team 1' }),
				createTestTeam({ id: 2, name: 'Team 2' }),
				createTestTeam({ id: 3, name: 'Team 3' }) // User not a member
			];
			await db.insert(teamsTable).values(teams);

			await db
				.insert(teamMembersTable)
				.values([
					createTestTeamMember({ teamId: 1, userId }),
					createTestTeamMember({ teamId: 2, userId })
				]);

			// When: getTeamsByUserId is called
			const result = await repository.getTeamsByUserId(userId);

			// Then: only teams user is member of should be returned
			expect(result).toHaveLength(2);
			expect(result.map((t) => t.name)).toEqual(['Team 1', 'Team 2']);
		});

		it('should use cache for subsequent calls', async () => {
			// Given: user is member of a team
			const userId = await createUser(1, 'Test User');
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);
			await db
				.insert(teamMembersTable)
				.values(createTestTeamMember({ teamId: teamData.id, userId }));

			// When: getTeamsByUserId is called multiple times
			const firstCall = await repository.getTeamsByUserId(userId);

			// Add user to another team
			const team2 = createTestTeam({ id: 2 });
			await db.insert(teamsTable).values(team2);
			await db.insert(teamMembersTable).values(createTestTeamMember({ teamId: team2.id, userId }));

			const secondCall = await repository.getTeamsByUserId(userId);

			// Then: second call should return cached data
			expect(secondCall).toEqual(firstCall);
			expect(secondCall).toHaveLength(1);
		});
	});

	describe('addTeamMember', () => {
		it('should add member to team', async () => {
			// Given: team and user exist
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);
			const userId = await createUser(1, 'Test User');

			// When: addTeamMember is called
			const result = await repository.addTeamMember(teamData.id, {
				userId,
				role: 'member'
			});

			// Then: member should be added
			expect(result).toMatchObject({
				teamId: teamData.id,
				userId,
				role: 'member'
			});

			// And: caches should be invalidated
			const team = await repository.getTeamById(teamData.id);
			expect(team?.members).toHaveLength(1);
		});

		it('should handle adding member with leader role', async () => {
			// Given: team and user exist
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);
			const userId = await createUser(1, 'Test User');

			// When: addTeamMember is called with leader role
			const result = await repository.addTeamMember(teamData.id, {
				userId,
				role: 'leader'
			});

			// Then: member should be added with leader role
			expect(result.role).toBe('leader');
		});
	});

	describe('removeTeamMember', () => {
		it('should remove member from team', async () => {
			// Given: team has a member
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);
			const userId = await createUser(1, 'Test User');
			await db
				.insert(teamMembersTable)
				.values(createTestTeamMember({ teamId: teamData.id, userId }));

			// When: removeTeamMember is called
			await repository.removeTeamMember(teamData.id, userId);

			// Then: member should be removed
			const members = await repository.getTeamMembers(teamData.id);
			expect(members).toHaveLength(0);

			// And: caches should be invalidated
			const team = await repository.getTeamById(teamData.id);
			expect(team?.members).toHaveLength(0);
		});

		it('should not throw when removing non-existent member', async () => {
			// Given: team exists but user is not a member
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);

			// When/Then: removeTeamMember should not throw
			await expect(repository.removeTeamMember(teamData.id, 999)).resolves.not.toThrow();
		});
	});

	describe('updateTeamMemberRole', () => {
		it('should update member role', async () => {
			// Given: team has a member
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);
			const userId = await createUser(1, 'Test User');
			await db.insert(teamMembersTable).values(
				createTestTeamMember({
					teamId: teamData.id,
					userId,
					role: 'member'
				})
			);

			// When: updateTeamMemberRole is called
			const result = await repository.updateTeamMemberRole(teamData.id, userId, 'leader');

			// Then: role should be updated
			expect(result.role).toBe('leader');

			// And: cache should be invalidated
			const team = await repository.getTeamById(teamData.id);
			expect(team?.members[0].role).toBe('leader');
		});
	});

	describe('getTeamMembers', () => {
		it('should return all team members', async () => {
			// Given: team has multiple members
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);

			const user1 = await createUser(1, 'User One');
			const user2 = await createUser(2, 'User Two');
			await db
				.insert(teamMembersTable)
				.values([
					createTestTeamMember({ teamId: teamData.id, userId: user1, role: 'leader' }),
					createTestTeamMember({ teamId: teamData.id, userId: user2, role: 'member' })
				]);

			// When: getTeamMembers is called
			const result = await repository.getTeamMembers(teamData.id);

			// Then: all members should be returned
			expect(result).toHaveLength(2);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ userId: user1, role: 'leader' }),
					expect.objectContaining({ userId: user2, role: 'member' })
				])
			);
		});

		it('should return empty array for team with no members', async () => {
			// Given: team exists with no members
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);

			// When: getTeamMembers is called
			const result = await repository.getTeamMembers(teamData.id);

			// Then: empty array should be returned
			expect(result).toEqual([]);
		});
	});

	// Team Invitations Tests
	describe('createTeamInvitation', () => {
		it('should create team invitation', async () => {
			// Given: team and users exist
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);
			const userId = await createUser(1, 'Invitee');
			const inviterId = await createUser(2, 'Inviter');

			// When: createTeamInvitation is called
			const result = await repository.createTeamInvitation({
				teamId: teamData.id,
				userId,
				invitedBy: inviterId
			});

			// Then: invitation should be created
			expect(result).toMatchObject({
				teamId: teamData.id,
				userId,
				invitedBy: inviterId,
				status: 'pending'
			});
		});
	});

	describe('getTeamInvitationById', () => {
		it('should return invitation when found', async () => {
			// Given: an invitation exists
			const teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);
			const userId = await createUser(1, 'Test User');
			const invitation = await repository.createTeamInvitation({
				teamId: teamData.id,
				userId,
				invitedBy: userId
			});

			// When: getTeamInvitationById is called
			const result = await repository.getTeamInvitationById(invitation.id);

			// Then: invitation should be returned
			expect(result).toMatchObject(invitation);
		});

		it('should return null when invitation not found', async () => {
			// When: getTeamInvitationById is called with non-existent ID
			const result = await repository.getTeamInvitationById(999);

			// Then: null should be returned
			expect(result).toBeNull();
		});
	});

	describe('invitation status updates', () => {
		let teamData: TeamData;
		let userId: number;
		let invitation: { id: number; status: string; responseAt: Date | null };

		beforeEach(async () => {
			teamData = createTestTeam();
			await db.insert(teamsTable).values(teamData);
			userId = await createUser(1, 'Test User');
			invitation = await repository.createTeamInvitation({
				teamId: teamData.id,
				userId,
				invitedBy: userId
			});
		});

		it('should accept invitation', async () => {
			// When: acceptTeamInvitation is called
			const result = await repository.acceptTeamInvitation(invitation.id);

			// Then: invitation status should be updated
			expect(result.status).toBe('accepted');
			expect(result.responseAt).toBeDefined();
		});

		it('should reject invitation', async () => {
			// When: rejectTeamInvitation is called
			const result = await repository.rejectTeamInvitation(invitation.id);

			// Then: invitation status should be updated
			expect(result.status).toBe('rejected');
			expect(result.responseAt).toBeDefined();
		});

		it('should cancel invitation', async () => {
			// When: cancelTeamInvitation is called
			const result = await repository.cancelTeamInvitation(invitation.id);

			// Then: invitation status should be updated
			expect(result.status).toBe('cancelled');
			expect(result.responseAt).toBeDefined();
		});
	});
});
