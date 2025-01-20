import { superValidate } from 'sveltekit-superforms/server';
import { fail } from '@sveltejs/kit';
import { awardPointsSchema } from './schema';
import type { PageServerLoad, Actions } from './$types';
import { zod } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(awardPointsSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		const form = await superValidate(request, zod(awardPointsSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch('/api/v1/points/award', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(form.data)
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				return fail(response.status, {
					form,
					error: 'Failed to award points. Please try again.',
					description: data.error
				});
			}

			return { form };
		} catch (e) {
			console.error(e);

			const description = e instanceof Error ? e.message : undefined;

			return fail(500, {
				form,
				error: 'An unexpected error occurred. Please try again.',
				description
			});
		}
	}
};
