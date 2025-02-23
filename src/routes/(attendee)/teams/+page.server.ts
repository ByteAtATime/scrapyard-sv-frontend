import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate } from 'sveltekit-superforms/server';
import { teamSchema } from '../../organizer/teams/schema';
import { inviteSchema, invitationActionSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { TEAM_CONFIG } from '$lib/server/teams/config';
import { ClerkAuthProvider } from '$lib/server/auth/clerk';
import { Team } from '$lib/server/teams/team';
import { TeamInvitation } from '$lib/server/teams/invitation';
import type { TeamInvitationJson } from '$lib/server/teams/invitation';
import { TeamsService, PostgresTeamsRepo } from '$lib/server/teams';

export const load: PageServerLoad = async ({ locals }) => {
	const authProvider = new ClerkAuthProvider(locals.auth);
	const teamsRepo = new PostgresTeamsRepo();
	const teamsService = new TeamsService(teamsRepo);
	const userId = await authProvider.getUserId();

	if (!userId) {
		throw redirect(302, '/login');
	}

	try {
		// Get user's team - they can only be in one team
		const userTeams = await teamsService.getTeamsByUserId(userId);

		// If user has multiple teams for some reason, only show the first one
		const userTeam = userTeams[0];
		let teamJson = null;
		let outgoingInvitationsJson: TeamInvitationJson[] = [];

		if (userTeam) {
			const fullTeam = await teamsService.getTeamById(userTeam.id);
			if (fullTeam) {
				const team = new Team(fullTeam, teamsRepo, authProvider);
				teamJson = await team.toJson();
				teamJson = {
					...teamJson,
					userRole: fullTeam.members.find((m) => m.userId === userId)?.role
				};

				// If user is a team leader, get pending and rejected invitations
				if (teamJson.userRole === 'leader') {
					const teamInvitations = await teamsService.getTeamInvitationsByTeamId(userTeam.id);
					const pendingInvitations = teamInvitations.filter((inv) => inv.status === 'pending');
					const rejectedInvitations = teamInvitations.filter((inv) => inv.status === 'rejected');

					outgoingInvitationsJson = await Promise.all([
						...pendingInvitations.map(async (inv) => {
							const invitation = new TeamInvitation(inv, teamsRepo, authProvider);
							return invitation.toJson();
						}),
						...rejectedInvitations.map(async (inv) => {
							const invitation = new TeamInvitation(inv, teamsRepo, authProvider);
							return invitation.toJson();
						})
					]);
				}
			}
		}

		// Get pending invitations for the user
		const invitations = await teamsService.getTeamInvitationsByUserId(userId);
		const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');
		const pendingInvitationsJson = await Promise.all(
			pendingInvitations.map(async (inv) => {
				const invitation = new TeamInvitation(inv, teamsRepo, authProvider);
				return invitation.toJson();
			})
		);

		return {
			team: teamJson,
			invitations: pendingInvitationsJson,
			outgoingInvitations: outgoingInvitationsJson,
			form: await superValidate(zod(teamSchema)),
			inviteForm: await superValidate(zod(inviteSchema)),
			acceptForm: await superValidate(zod(invitationActionSchema)),
			rejectForm: await superValidate(zod(invitationActionSchema)),
			cancelForm: await superValidate(zod(invitationActionSchema)),
			maxTeamSize: TEAM_CONFIG.MAX_MEMBERS
		};
	} catch (err) {
		console.error('Failed to load team:', err);
		throw fail(500, { error: 'Failed to load team' });
	}
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const teamsService = new TeamsService(new PostgresTeamsRepo());
		const authProvider = new ClerkAuthProvider(locals.auth);
		const userId = await authProvider.getUserId();

		if (!userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Check if user is already in a team
		const userTeams = await teamsService.getTeamsByUserId(userId);
		if (userTeams.length > 0) {
			return fail(400, { error: 'You are already a member of a team' });
		}

		const form = await superValidate(request, zod(teamSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const team = await teamsService.createTeam(form.data);
			// Add the creator as a leader
			await teamsService.addTeamMember(team.id, {
				userId,
				role: 'leader'
			});
			return message(form, 'Team created successfully');
		} catch (err) {
			console.error('Failed to create team:', err);
			return fail(500, {
				form,
				error: 'Failed to create team. Please try again later.'
			});
		}
	},

	invite: async ({ request, locals }) => {
		const teamsService = new TeamsService(new PostgresTeamsRepo());
		const authProvider = new ClerkAuthProvider(locals.auth);
		const userId = await authProvider.getUserId();

		if (!userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const form = await superValidate(request, zod(inviteSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { userId: inviteeId } = form.data;

		// Get user's team
		const userTeams = await teamsService.getTeamsByUserId(userId);
		if (userTeams.length === 0) {
			return fail(403, { form, error: 'You are not a member of any team' });
		}

		// Get the team and verify user is a leader
		const team = await teamsService.getTeamById(userTeams[0].id);
		if (!team) {
			return fail(404, { form, error: 'Team not found' });
		}

		const member = team.members.find((m) => m.userId === userId);
		if (!member || member.role !== 'leader') {
			return fail(403, { form, error: 'Only team leaders can invite members' });
		}

		// Check if team is full including pending invitations
		const teamInvitations = await teamsService.getTeamInvitationsByTeamId(team.id);
		const pendingInvitations = teamInvitations.filter((inv) => inv.status === 'pending');
		if (team.members.length + pendingInvitations.length >= TEAM_CONFIG.MAX_MEMBERS) {
			return fail(400, {
				form,
				error:
					'Team is full including pending invitations. Cancel some pending invitations to invite new members.'
			});
		}

		try {
			await teamsService.inviteToTeam(team.id, inviteeId, userId);
			return message(form, 'Invitation sent successfully');
		} catch (err) {
			console.error('Failed to invite member:', err);
			return fail(500, {
				form,
				error: err instanceof Error ? err.message : 'Failed to invite member'
			});
		}
	},

	cancelInvitation: async ({ request, locals }) => {
		const teamsService = new TeamsService(new PostgresTeamsRepo());
		const authProvider = new ClerkAuthProvider(locals.auth);
		const userId = await authProvider.getUserId();

		if (!userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const form = await superValidate(request, zod(invitationActionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await teamsService.cancelTeamInvitation(form.data.invitationId);
			return message(form, 'Invitation cancelled successfully');
		} catch (err) {
			console.error('Failed to cancel invitation:', err);
			return fail(500, {
				form,
				error: err instanceof Error ? err.message : 'Failed to cancel invitation'
			});
		}
	},

	acceptInvitation: async ({ request, locals }) => {
		const teamsService = new TeamsService(new PostgresTeamsRepo());
		const authProvider = new ClerkAuthProvider(locals.auth);
		const userId = await authProvider.getUserId();

		if (!userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const form = await superValidate(request, zod(invitationActionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await teamsService.acceptTeamInvitation(form.data.invitationId);
			return message(form, 'Invitation accepted successfully');
		} catch (err) {
			console.error('Failed to accept invitation:', err);
			return fail(500, {
				form,
				error: err instanceof Error ? err.message : 'Failed to accept invitation'
			});
		}
	},

	rejectInvitation: async ({ request, locals }) => {
		const teamsService = new TeamsService(new PostgresTeamsRepo());
		const authProvider = new ClerkAuthProvider(locals.auth);
		const userId = await authProvider.getUserId();

		if (!userId) {
			return fail(401, { error: 'Unauthorized' });
		}

		const form = await superValidate(request, zod(invitationActionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await teamsService.rejectTeamInvitation(form.data.invitationId);
			return message(form, 'Invitation rejected successfully');
		} catch (err) {
			console.error('Failed to reject invitation:', err);
			return fail(500, {
				form,
				error: err instanceof Error ? err.message : 'Failed to reject invitation'
			});
		}
	}
};
