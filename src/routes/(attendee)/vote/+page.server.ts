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
import type { ScrapData } from '$lib/server/scrapper';
import { MAX_VOTES_PER_HOUR } from '$lib/server/scrapper/types';

const voteHandler: PageHandler<
	WithAuthProvider & WithScrapperService & WithSuperForm<typeof voteSchema>
> = async ({ authProvider, scrapperService, form }) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		return fail(401, { form, error: 'Unauthorized' });
	}

	try {
		const votesInLastHour = await scrapperService.getUserVotesInLastHour(userId);
		if (votesInLastHour >= MAX_VOTES_PER_HOUR) {
			return fail(429, {
				form,
				error: `You have reached the maximum of ${MAX_VOTES_PER_HOUR} votes per hour. Please try again later.`
			});
		}

		const vote = await scrapperService.voteOnScrap({
			userId: userId,
			scrapId: form.data.scrapId,
			otherScrapId: form.data.otherScrapId
		});

		return { success: true, data: vote, form };
	} catch (error) {
		console.error(error);
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
	const emptyForm = await superValidate(zod(voteSchema));

	const userId = await authProvider.getUserId();
	if (!userId) {
		return {
			scraps: [],
			voteForm: emptyForm,
			votesInLastHour: 0,
			maxVotesPerHour: MAX_VOTES_PER_HOUR,
			oldestVoteTime: null
		};
	}

	const votesInLastHour = await scrapperService.getUserVotesInLastHour(userId);
	const oldestVoteTime = await scrapperService.getOldestVoteTimeInLastHour(userId);

	let scraps: ScrapData[] = [];

	try {
		scraps = await scrapperService.getRandomScrapsForVoting(userId);
	} catch (error) {
		console.error(error);
		return {
			scraps: [],
			voteForm: emptyForm,
			votesInLastHour,
			maxVotesPerHour: MAX_VOTES_PER_HOUR,
			oldestVoteTime
		};
	}

	const form = await superValidate(
		{
			scrapId: scraps[0].id,
			otherScrapId: scraps[1].id
		},
		zod(voteSchema)
	);

	return {
		scraps,
		voteForm: form,
		votesInLastHour,
		maxVotesPerHour: MAX_VOTES_PER_HOUR,
		oldestVoteTime
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
