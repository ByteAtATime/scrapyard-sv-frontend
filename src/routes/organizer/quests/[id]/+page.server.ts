import { error } from '@sveltejs/kit';
import { composePage, type PageHandler } from '$lib/server/endpoints';
import {
	withAuthProvider,
	withQuestService,
	type WithAuthProvider,
	type WithQuestService
} from '$lib/server/endpoints/dependencies';

interface Params {
	id: string;
}

const loadHandler: PageHandler<WithAuthProvider & WithQuestService & { params: Params }> = async ({
	params,
	authProvider,
	questService
}) => {
	// Check if user is an organizer
	const isOrganizer = await authProvider.isOrganizer();
	if (!isOrganizer) {
		throw error(403, 'Unauthorized');
	}

	const questId = parseInt(params.id);
	if (isNaN(questId)) {
		throw error(400, 'Invalid quest ID');
	}

	try {
		// Get the quest
		const quest = await questService.getQuestById(questId);

		// Get submissions for this quest
		const submissions = await questService.getQuestSubmissions(questId);

		return {
			quest: {
				...quest,
				endTime: quest.endTime.toISOString()
			},
			submissions: submissions.map((submission) => ({
				...submission,
				submittedAt: submission.submittedAt.toISOString(),
				reviewedAt: submission.reviewedAt ? submission.reviewedAt.toISOString() : null
			}))
		};
	} catch (err) {
		console.error(err);
		throw error(404, 'Quest not found');
	}
};

export const load = composePage(withAuthProvider(), withQuestService())(loadHandler);
