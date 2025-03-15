import type { EndpointHandler } from '$lib/server/endpoints';
import type { WithAuthProvider, WithQuestService } from '$lib/server/endpoints/dependencies';
import { TeamNotFoundError, NotTeamMemberError } from '$lib/server/quests/types';
import { NotAuthenticatedError } from '$lib/server/points/types';
import type { QuestSubmissionData } from '$lib/server/db/types';

// Define the params type
type TeamParams = {
	teamId: number;
};

export const endpoint_GET: EndpointHandler<
	WithAuthProvider & WithQuestService & { params: TeamParams }
> = async ({ authProvider, questService, params }) => {
	try {
		const userId = await authProvider.getUserId();
		if (!userId) {
			return {
				error: 'Unauthorized',
				status: 401
			};
		}

		// Get submissions for the team using the validated params
		const submissions = await questService.getQuestSubmissionsByTeam(params.teamId);

		// Format the response
		return submissions.map((submission: QuestSubmissionData) => ({
			...submission,
			submittedAt: submission.submittedAt.toISOString(),
			reviewedAt: submission.reviewedAt ? submission.reviewedAt.toISOString() : null
		}));
	} catch (error) {
		if (error instanceof NotAuthenticatedError) {
			return {
				error: error.message,
				status: 401
			};
		}

		if (error instanceof TeamNotFoundError) {
			return {
				error: error.message,
				status: 404
			};
		}

		if (error instanceof NotTeamMemberError) {
			return {
				error: error.message,
				status: 403
			};
		}

		console.error('Unexpected error:', error);
		return {
			error: 'Internal server error',
			status: 500
		};
	}
};
