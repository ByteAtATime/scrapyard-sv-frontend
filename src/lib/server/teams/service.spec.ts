import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamsService } from './service';
import type { ITeamsRepo } from './types';
import type { TeamData, TeamMemberData, TeamWithMembersData } from '../db/types';
import { MockTeamsRepo } from './mock';

describe('TeamsService', () => {
	let mockRepo: ITeamsRepo;
	let service: TeamsService;

	beforeEach(() => {
		mockRepo = new MockTeamsRepo();
		service = new TeamsService(mockRepo);
	});

	describe('createTeam', () => {
		it('should create team through repository', async () => {
			const mockTeam = { id: 1, name: 'Test Team' } as TeamData;
			vi.mocked(mockRepo.createTeam).mockResolvedValueOnce(mockTeam);

			const result = await service.createTeam({
				name: 'Test Team',
				description: 'Test Description'
			});

			expect(result).toEqual(mockTeam);
			expect(mockRepo.createTeam).toHaveBeenCalledWith({
				name: 'Test Team',
				description: 'Test Description'
			});
		});
	});

	describe('updateTeam', () => {
		it('should update team through repository', async () => {
			const mockTeam = { id: 1, name: 'Updated Team' } as TeamData;
			vi.mocked(mockRepo.updateTeam).mockResolvedValueOnce(mockTeam);

			const result = await service.updateTeam(1, {
				name: 'Updated Team'
			});

			expect(result).toEqual(mockTeam);
			expect(mockRepo.updateTeam).toHaveBeenCalledWith(1, {
				name: 'Updated Team'
			});
		});
	});

	describe('deleteTeam', () => {
		it('should delete team through repository', async () => {
			await service.deleteTeam(1);
			expect(mockRepo.deleteTeam).toHaveBeenCalledWith(1);
		});
	});

	describe('getTeamById', () => {
		it('should return team with members from repository', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [
					{
						teamId: 1,
						userId: 1,
						role: 'leader',
						user: {
							id: 1,
							name: 'Test User'
						}
					}
				]
			} as TeamWithMembersData;
			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);

			const result = await service.getTeamById(1);
			expect(result).toEqual(mockTeam);
			expect(mockRepo.getTeamById).toHaveBeenCalledWith(1);
		});

		it('should return null when team not found', async () => {
			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(null);

			const result = await service.getTeamById(999);
			expect(result).toBeNull();
			expect(mockRepo.getTeamById).toHaveBeenCalledWith(999);
		});
	});

	describe('getTeams', () => {
		it('should return all teams from repository', async () => {
			const mockTeams = [{ id: 1, name: 'Test Team' }] as TeamData[];
			vi.mocked(mockRepo.getTeams).mockResolvedValueOnce(mockTeams);

			const result = await service.getTeams();
			expect(result).toEqual(mockTeams);
			expect(mockRepo.getTeams).toHaveBeenCalled();
		});
	});

	describe('getTeamsByUserId', () => {
		it('should return user teams from repository', async () => {
			const mockTeams = [{ id: 1, name: 'Test Team' }] as TeamData[];
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce(mockTeams);

			const result = await service.getTeamsByUserId(1);
			expect(result).toEqual(mockTeams);
			expect(mockRepo.getTeamsByUserId).toHaveBeenCalledWith(1);
		});

		it('should return empty array when user has no teams', async () => {
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([]);

			const result = await service.getTeamsByUserId(1);
			expect(result).toEqual([]);
			expect(mockRepo.getTeamsByUserId).toHaveBeenCalledWith(1);
		});
	});

	describe('addTeamMember', () => {
		it('should add team member through repository', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [
					{ userId: 2, role: 'leader' } // Add an existing leader
				]
			} as TeamWithMembersData;
			const mockMember = { teamId: 1, userId: 1, role: 'member' } as TeamMemberData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([]);
			vi.mocked(mockRepo.addTeamMember).mockResolvedValueOnce(mockMember);

			const result = await service.addTeamMember(1, {
				userId: 1,
				role: 'member'
			});

			expect(result).toEqual(mockMember);
			expect(mockRepo.addTeamMember).toHaveBeenCalledWith(1, {
				userId: 1,
				role: 'member'
			});
		});

		it('should make first member a leader', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: []
			} as TeamWithMembersData;
			const mockMember = { teamId: 1, userId: 1, role: 'leader' } as TeamMemberData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([]);
			vi.mocked(mockRepo.addTeamMember).mockResolvedValueOnce(mockMember);

			const result = await service.addTeamMember(1, {
				userId: 1,
				role: 'member' // Even though we specify member, it should be changed to leader
			});

			expect(result).toEqual(mockMember);
			expect(mockRepo.addTeamMember).toHaveBeenCalledWith(1, {
				userId: 1,
				role: 'leader'
			});
		});

		it('should throw error when team not found', async () => {
			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(null);

			await expect(
				service.addTeamMember(1, {
					userId: 1,
					role: 'member'
				})
			).rejects.toThrow('Team not found');
		});

		it('should throw error when team is full', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: Array(4).fill({ userId: 1, role: 'member' })
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);

			await expect(
				service.addTeamMember(1, {
					userId: 5,
					role: 'member'
				})
			).rejects.toThrow('Team cannot have more than 4 members');
		});

		it('should throw error when user is already a member', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ userId: 1, role: 'member' }]
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);

			await expect(
				service.addTeamMember(1, {
					userId: 1,
					role: 'member'
				})
			).rejects.toThrow('User is already a member of this team');
		});

		it('should throw error when user is already in another team', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: []
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([{ id: 2 }] as TeamData[]);

			await expect(
				service.addTeamMember(1, {
					userId: 1,
					role: 'member'
				})
			).rejects.toThrow('User is already a member of another team');
		});
	});

	describe('removeTeamMember', () => {
		it('should remove team member through repository', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [
					{ userId: 1, role: 'member' },
					{ userId: 2, role: 'leader' }
				]
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);
			await service.removeTeamMember(1, 1);
			expect(mockRepo.removeTeamMember).toHaveBeenCalledWith(1, 1);
		});

		it('should not allow removing the last leader', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ userId: 1, role: 'leader' }]
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);
			await expect(service.removeTeamMember(1, 1)).rejects.toThrow(
				'Cannot remove the last team leader'
			);
		});

		it('should throw error when team not found', async () => {
			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(null);

			await expect(service.removeTeamMember(1, 1)).rejects.toThrow('Team not found');
		});
	});

	describe('updateTeamMemberRole', () => {
		it('should update team member role through repository', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [
					{ userId: 1, role: 'member' },
					{ userId: 2, role: 'leader' }
				]
			} as TeamWithMembersData;
			const mockMember = { teamId: 1, userId: 1, role: 'leader' } as TeamMemberData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);
			vi.mocked(mockRepo.updateTeamMemberRole).mockResolvedValueOnce(mockMember);

			const result = await service.updateTeamMemberRole(1, 1, 'leader');
			expect(result).toEqual(mockMember);
			expect(mockRepo.updateTeamMemberRole).toHaveBeenCalledWith(1, 1, 'leader');
		});

		it('should not allow demoting the last leader', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ userId: 1, role: 'leader' }]
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);
			await expect(service.updateTeamMemberRole(1, 1, 'member')).rejects.toThrow(
				'Cannot demote the last team leader'
			);
		});

		it('should throw error when team not found', async () => {
			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(null);

			await expect(service.updateTeamMemberRole(1, 1, 'leader')).rejects.toThrow('Team not found');
		});
	});

	describe('getTeamMembers', () => {
		it('should return team members from repository', async () => {
			const mockMembers = [{ teamId: 1, userId: 1, role: 'member' }] as TeamMemberData[];
			vi.mocked(mockRepo.getTeamMembers).mockResolvedValueOnce(mockMembers);

			const result = await service.getTeamMembers(1);
			expect(result).toEqual(mockMembers);
			expect(mockRepo.getTeamMembers).toHaveBeenCalledWith(1);
		});

		it('should return empty array when team has no members', async () => {
			vi.mocked(mockRepo.getTeamMembers).mockResolvedValueOnce([]);

			const result = await service.getTeamMembers(1);
			expect(result).toEqual([]);
			expect(mockRepo.getTeamMembers).toHaveBeenCalledWith(1);
		});
	});

	describe('inviteToTeam', () => {
		it('should create team invitation through repository', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ userId: 2, role: 'leader' }]
			} as TeamWithMembersData;
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'pending' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: null
			};

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([]);
			vi.mocked(mockRepo.getTeamInvitationsByTeamId).mockResolvedValueOnce([]);
			vi.mocked(mockRepo.createTeamInvitation).mockResolvedValueOnce(mockInvitation);

			const result = await service.inviteToTeam(1, 3, 2);
			expect(result).toEqual(mockInvitation);
			expect(mockRepo.createTeamInvitation).toHaveBeenCalledWith({
				teamId: 1,
				userId: 3,
				invitedBy: 2
			});
		});

		it('should not allow inviting when team is full', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: Array(4).fill({ role: 'member' })
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);

			await expect(service.inviteToTeam(1, 3, 2)).rejects.toThrow(
				'Team cannot have more than 4 members'
			);
		});

		it('should not allow inviting when user is already in a team', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ userId: 2, role: 'leader' }]
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([{ id: 2 }] as TeamData[]);

			await expect(service.inviteToTeam(1, 3, 2)).rejects.toThrow(
				'User is already a member of a team'
			);
		});

		it('should not allow duplicate pending invitations', async () => {
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ userId: 2, role: 'leader' }]
			} as TeamWithMembersData;
			const existingInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'pending' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: null
			};

			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([]);
			vi.mocked(mockRepo.getTeamInvitationsByTeamId).mockResolvedValueOnce([existingInvitation]);

			await expect(service.inviteToTeam(1, 3, 2)).rejects.toThrow(
				'User already has a pending invitation to this team'
			);
		});

		it('should throw error when team not found', async () => {
			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(null);

			await expect(service.inviteToTeam(1, 3, 2)).rejects.toThrow('Team not found');
		});
	});

	describe('acceptTeamInvitation', () => {
		it('should accept invitation and add member through repository', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'pending' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: null
			};
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ userId: 2, role: 'leader' }]
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);
			vi.mocked(mockRepo.getTeamsByUserId)
				.mockResolvedValueOnce([]) // First check in acceptTeamInvitation
				.mockResolvedValueOnce([]); // Second check in addTeamMember
			vi.mocked(mockRepo.getTeamById)
				.mockResolvedValueOnce(mockTeam)
				.mockResolvedValueOnce(mockTeam);
			vi.mocked(mockRepo.acceptTeamInvitation).mockResolvedValueOnce({
				...mockInvitation,
				status: 'accepted' as const,
				responseAt: new Date()
			});
			vi.mocked(mockRepo.addTeamMember).mockResolvedValueOnce({
				teamId: 1,
				userId: 3,
				role: 'member',
				joinedAt: new Date()
			});

			const result = await service.acceptTeamInvitation(1);
			expect(result.status).toBe('accepted');
			expect(mockRepo.addTeamMember).toHaveBeenCalledWith(1, {
				userId: 3,
				role: 'member'
			});
		});

		it('should not accept non-pending invitation', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'rejected' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: new Date()
			};

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);

			await expect(service.acceptTeamInvitation(1)).rejects.toThrow('Invitation is not pending');
		});

		it('should not accept when team is full', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'pending' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: null
			};
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: Array(4).fill({ role: 'member' })
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([]);
			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(mockTeam);

			await expect(service.acceptTeamInvitation(1)).rejects.toThrow(
				'Team cannot have more than 4 members'
			);
		});

		it('should throw error when invitation not found', async () => {
			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(null);

			await expect(service.acceptTeamInvitation(1)).rejects.toThrow('Invitation not found');
		});

		it('should throw error when user is already in a team', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'pending' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: null
			};

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([{ id: 2 }] as TeamData[]);

			await expect(service.acceptTeamInvitation(1)).rejects.toThrow(
				'User is already a member of a team'
			);
		});

		it('should throw error when team not found during acceptance', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'pending' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: null
			};

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([]);
			vi.mocked(mockRepo.getTeamById).mockResolvedValueOnce(null);

			await expect(service.acceptTeamInvitation(1)).rejects.toThrow('Team not found');
		});

		it('should throw error when team not found during member addition', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'pending' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: null
			};
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ userId: 2, role: 'leader' }]
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);
			vi.mocked(mockRepo.getTeamsByUserId).mockResolvedValueOnce([]);
			vi.mocked(mockRepo.getTeamById)
				.mockResolvedValueOnce(mockTeam) // First call succeeds
				.mockResolvedValueOnce(null); // Second call fails during addTeamMember

			await expect(service.acceptTeamInvitation(1)).rejects.toThrow('Team not found');
		});

		it('should handle errors during team member addition', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'pending' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: null
			};
			const mockTeam = {
				id: 1,
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ userId: 2, role: 'leader' }]
			} as TeamWithMembersData;

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);
			vi.mocked(mockRepo.getTeamsByUserId)
				.mockResolvedValueOnce([]) // First check in acceptTeamInvitation
				.mockResolvedValueOnce([]); // Second check in addTeamMember
			vi.mocked(mockRepo.getTeamById)
				.mockResolvedValueOnce(mockTeam)
				.mockResolvedValueOnce(mockTeam);
			vi.mocked(mockRepo.acceptTeamInvitation).mockResolvedValueOnce({
				...mockInvitation,
				status: 'accepted' as const,
				responseAt: new Date()
			});
			vi.mocked(mockRepo.addTeamMember).mockRejectedValueOnce(
				new Error('Failed to add team member')
			);

			await expect(service.acceptTeamInvitation(1)).rejects.toThrow('Failed to add team member');
		});
	});

	describe('rejectTeamInvitation', () => {
		it('should reject invitation through repository', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'pending' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: null
			};

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);
			vi.mocked(mockRepo.rejectTeamInvitation).mockResolvedValueOnce({
				...mockInvitation,
				status: 'rejected' as const,
				responseAt: new Date()
			});

			const result = await service.rejectTeamInvitation(1);
			expect(result.status).toBe('rejected');
		});

		it('should not reject non-pending invitation', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'accepted' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: new Date()
			};

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);

			await expect(service.rejectTeamInvitation(1)).rejects.toThrow('Invitation is not pending');
		});

		it('should throw error when invitation not found', async () => {
			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(null);

			await expect(service.rejectTeamInvitation(1)).rejects.toThrow('Invitation not found');
		});
	});

	describe('cancelTeamInvitation', () => {
		it('should cancel invitation through repository', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'pending' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: null
			};

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);
			vi.mocked(mockRepo.cancelTeamInvitation).mockResolvedValueOnce({
				...mockInvitation,
				status: 'cancelled' as const,
				responseAt: new Date()
			});

			const result = await service.cancelTeamInvitation(1);
			expect(result.status).toBe('cancelled');
		});

		it('should not cancel non-pending invitation', async () => {
			const mockInvitation = {
				id: 1,
				teamId: 1,
				userId: 3,
				invitedBy: 2,
				status: 'accepted' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				responseAt: new Date()
			};

			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(mockInvitation);

			await expect(service.cancelTeamInvitation(1)).rejects.toThrow('Invitation is not pending');
		});

		it('should throw error when invitation not found', async () => {
			vi.mocked(mockRepo.getTeamInvitationById).mockResolvedValueOnce(null);

			await expect(service.cancelTeamInvitation(1)).rejects.toThrow('Invitation not found');
		});
	});

	describe('getTeamInvitationsByUserId', () => {
		it('should return team invitations for a user', async () => {
			const mockInvitations = [
				{
					id: 1,
					teamId: 1,
					userId: 3,
					invitedBy: 2,
					status: 'pending' as const,
					createdAt: new Date(),
					updatedAt: new Date(),
					responseAt: null,
					team: {
						id: 1,
						name: 'Test Team',
						description: 'Test Description',
						createdAt: new Date(),
						updatedAt: new Date()
					}
				}
			];

			vi.mocked(mockRepo.getTeamInvitationsByUserId).mockResolvedValueOnce(mockInvitations);

			const result = await service.getTeamInvitationsByUserId(3);
			expect(result).toEqual(mockInvitations);
			expect(mockRepo.getTeamInvitationsByUserId).toHaveBeenCalledWith(3);
		});

		it('should return empty array when user has no invitations', async () => {
			vi.mocked(mockRepo.getTeamInvitationsByUserId).mockResolvedValueOnce([]);

			const result = await service.getTeamInvitationsByUserId(3);
			expect(result).toEqual([]);
			expect(mockRepo.getTeamInvitationsByUserId).toHaveBeenCalledWith(3);
		});
	});

	describe('getTeamInvitationsByTeamId', () => {
		it('should return team invitations for a team', async () => {
			const mockInvitations = [
				{
					id: 1,
					teamId: 1,
					userId: 3,
					invitedBy: 2,
					status: 'pending' as const,
					createdAt: new Date(),
					updatedAt: new Date(),
					responseAt: null
				}
			];

			vi.mocked(mockRepo.getTeamInvitationsByTeamId).mockResolvedValueOnce(mockInvitations);

			const result = await service.getTeamInvitationsByTeamId(1);
			expect(result).toEqual(mockInvitations);
			expect(mockRepo.getTeamInvitationsByTeamId).toHaveBeenCalledWith(1);
		});

		it('should return empty array when team has no invitations', async () => {
			vi.mocked(mockRepo.getTeamInvitationsByTeamId).mockResolvedValueOnce([]);

			const result = await service.getTeamInvitationsByTeamId(1);
			expect(result).toEqual([]);
			expect(mockRepo.getTeamInvitationsByTeamId).toHaveBeenCalledWith(1);
		});
	});
});
