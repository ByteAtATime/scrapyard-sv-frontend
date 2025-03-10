import {
	composePage,
	withSuperForm,
	type PageHandler,
	type WithSuperForm
} from '$lib/server/endpoints';
import {
	withAuthProvider,
	withScrapperService,
	type WithAuthProvider,
	type WithScrapperService
} from '$lib/server/endpoints/dependencies';
import { fail } from 'sveltekit-superforms';
import { superValidate } from 'sveltekit-superforms/server';
import { voteSchema } from '../scrapper/schema';
import { zod } from 'sveltekit-superforms/adapters';

const voteHandler: PageHandler<
	WithAuthProvider & WithScrapperService & WithSuperForm<typeof voteSchema>
> = async ({ authProvider, scrapperService, form }) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		return fail(401, { form, error: 'Unauthorized' });
	}

	try {
		const vote = await scrapperService.voteOnScrap({
			userId: userId,
			scrapId: form.data.scrapId,
			otherScrapId: form.data.otherScrapId
		});

		return { success: true, data: vote, form };
	} catch (error) {
		return fail(400, {
			form,
			error: error instanceof Error ? error.message : 'Failed to submit vote'
		});
	}
};

const loadHandler: PageHandler<WithAuthProvider & WithScrapperService> = async ({
	authProvider,
	scrapperService
}) => {
	// Always create the form first
	const form = await superValidate(zod(voteSchema));

	const userId = await authProvider.getUserId();
	if (!userId) {
		return {
			scraps: [],
			voteForm: form
		};
	}

	// Get two random scraps to vote on
	const scraps = await scrapperService.getRandomScrapsForVoting(userId);

	return {
		scraps,
		voteForm: form
	};
};

export const load = composePage(withAuthProvider(), withScrapperService())(loadHandler);

export const actions = {
	vote: composePage(
		withAuthProvider(),
		withScrapperService(),
		withSuperForm(voteSchema)
	)(voteHandler)
};
