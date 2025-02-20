import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate } from 'sveltekit-superforms/server';
import { teamSchema } from './schema';
import { teamsService, teamsRepo } from '$lib/server/teams';
import { zod } from 'sveltekit-superforms/adapters';
import { Team } from '$lib/server/teams/team';
import { ClerkAuthProvider } from '$lib/server/auth/clerk';

export const load: PageServerLoad = async ({ locals }) => {
	const authProvider = new ClerkAuthProvider(locals.auth);

	try {
		const teams = await teamsService.getTeams();
		const teamsJson = await Promise.all(
			teams.map(async (teamData) => {
				const team = new Team(teamData, teamsRepo, authProvider);
				const json = await team.toJson();
				return {
					...json,
					memberCount: json.members.length
				};
			})
		);

		return {
			teams: teamsJson,
			form: await superValidate(zod(teamSchema))
		};
	} catch (err) {
		console.error('Failed to load teams:', err);
		throw fail(500, { error: 'Failed to load teams' });
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await superValidate(request, zod(teamSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await teamsService.createTeam(form.data);
			return message(form, 'Team created successfully');
		} catch (err) {
			console.error('Failed to create team:', err);
			return fail(500, {
				form,
				error: { message: 'Failed to create team. Please try again later.' }
			});
		}
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const teamId = Number(data.get('teamId'));

		if (!teamId) {
			return fail(400, { error: 'Team ID is required' });
		}

		try {
			await teamsService.deleteTeam(teamId);
			return { success: true };
		} catch (err) {
			console.error('Failed to delete team:', err);
			return fail(500, { error: 'Failed to delete team' });
		}
	}
};
