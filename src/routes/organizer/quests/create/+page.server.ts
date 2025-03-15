import { fail } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms/server';
import { createQuestSchema } from '../schema';
import { zod } from 'sveltekit-superforms/adapters';
import {
	composePage,
	withSuperForm,
	type PageHandler,
	type WithSuperForm
} from '$lib/server/endpoints';
import {
	withAuthProvider,
	withQuestService,
	type WithAuthProvider,
	type WithQuestService
} from '$lib/server/endpoints/dependencies';

const loadHandler: PageHandler<WithAuthProvider> = async ({ authProvider }) => {
	// Check if user is an organizer
	const isOrganizer = await authProvider.isOrganizer();
	if (!isOrganizer) {
		return {
			form: await superValidate(zod(createQuestSchema))
		};
	}

	return {
		form: await superValidate(zod(createQuestSchema))
	};
};

const createQuestHandler: PageHandler<
	WithAuthProvider & WithQuestService & WithSuperForm<typeof createQuestSchema>
> = async ({ authProvider, questService, form }) => {
	// Check if user is an organizer
	const isOrganizer = await authProvider.isOrganizer();
	if (!isOrganizer) {
		return fail(403, { form, error: 'Unauthorized' });
	}

	try {
		const quest = await questService.createQuest({
			...form.data,
			endTime: new Date(form.data.endTime)
		});

		return message(form, { id: quest.id, success: true });
	} catch (error) {
		console.error(error);
		return fail(500, {
			form,
			error: { message: error instanceof Error ? error.message : 'Failed to create quest' }
		});
	}
};

export const load = composePage(withAuthProvider())(loadHandler);

export const actions: Actions = {
	default: composePage(
		withAuthProvider(),
		withQuestService(),
		withSuperForm(createQuestSchema)
	)(createQuestHandler)
};
