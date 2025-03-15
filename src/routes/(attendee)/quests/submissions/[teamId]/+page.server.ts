import { composePage, withRouteParams, type PageHandler } from '$lib/server/endpoints';
import {
	withAuthProvider,
	withQuestService,
	type WithAuthProvider,
	type WithQuestService
} from '$lib/server/endpoints/dependencies';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

// Define schema for route parameters
const teamParamsSchema = z.object({
	teamId: z.coerce.number().int().positive('Team ID must be a positive integer')
});

type TeamParams = z.infer<typeof teamParamsSchema>;

const loadHandler: PageHandler<
	WithAuthProvider & WithQuestService & { params: TeamParams }
> = async ({ authProvider, questService, params }) => {
	const userId = await authProvider.getUserId();
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		// In a real application, this would come from a team service
		// For now, we're using a mock team since each user only has one team
		const userTeam = {
			id: params.teamId,
			name: 'My Team'
		};

		// Get submissions for the team
		const submissions = await questService.getQuestSubmissionsByTeam(userTeam.id);

		// Get all active quests to show quest details
		const allQuests = await questService.getQuests();
		const questsMap = new Map(allQuests.map((quest) => [quest.id, quest]));

		return {
			team: userTeam,
			submissions: submissions.map((submission) => ({
				...submission,
				submittedAt: submission.submittedAt.toISOString(),
				reviewedAt: submission.reviewedAt ? submission.reviewedAt.toISOString() : null,
				quest: questsMap.get(submission.questId)
			}))
		};
	} catch (e) {
		console.error('Error loading team quest submissions:', e);
		throw error(500, 'Failed to load team quest submissions');
	}
};

export const load = composePage(
	withAuthProvider(),
	withQuestService(),
	withRouteParams(teamParamsSchema)
)(loadHandler);
