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
const questParamsSchema = z.object({
	id: z.coerce.number().int().positive('Quest ID must be a positive integer')
});

type QuestParams = z.infer<typeof questParamsSchema>;

const loadHandler: PageHandler<
	WithAuthProvider & WithQuestService & { params: QuestParams }
> = async ({ authProvider, questService, params }) => {
	// Check if user is an organizer
	const isOrganizer = await authProvider.isOrganizer();
	if (!isOrganizer) {
		throw error(403, 'Forbidden');
	}

	try {
		// Get quest details
		const quest = await questService.getQuestById(params.id);

		// Get all submissions for this quest
		const submissions = await questService.getQuestSubmissions(params.id);

		// Get all teams to show team names
		// In a real application, this would come from a team service
		// For now, we're using a mock team
		const mockTeam = {
			id: 1,
			name: 'Team 1'
		};

		// Format the response
		return {
			quest: {
				...quest,
				endTime: quest.endTime.toISOString()
			},
			submissions: submissions.map((submission) => ({
				...submission,
				submittedAt: submission.submittedAt.toISOString(),
				reviewedAt: submission.reviewedAt ? submission.reviewedAt.toISOString() : null,
				team: mockTeam
			}))
		};
	} catch (e) {
		console.error('Error loading quest submissions:', e);
		throw error(500, 'Failed to load quest submissions');
	}
};

export const load = composePage(
	withAuthProvider(),
	withQuestService(),
	withRouteParams(questParamsSchema)
)(loadHandler);
