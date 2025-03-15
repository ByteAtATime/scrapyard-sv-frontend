import type { EndpointHandler } from '$lib/server/endpoints';
import type { QuestService } from '$lib/server/quests/service';
import { QuestSubmissionNotFoundError, QuestNotFoundError } from '$lib/server/quests/types';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/points/types';
import { z } from 'zod';

export const reviewSubmissionSchema = z.object({
	status: z.enum(['approved', 'rejected']),
	rejectionReason: z.string().optional()
});

export const paramsSchema = z.object({
	id: z.string()
});

export const endpoint_PUT: EndpointHandler<{
	questService: QuestService;
	params: z.infer<typeof paramsSchema>;
	body: z.infer<typeof reviewSubmissionSchema>;
}> = async ({ questService, params, body }) => {
	try {
		const submissionId = parseInt(params.id);

		// The reviewQuestSubmission method will get the reviewerId from the authenticated user
		// We only need to pass the status and rejectionReason
		const submission = await questService.reviewQuestSubmission(submissionId, {
			status: body.status,
			rejectionReason: body.rejectionReason,
			reviewerId: 0
		}); // reviewerId will be added by the service

		return submission;
	} catch (error) {
		if (error instanceof QuestSubmissionNotFoundError) {
			return {
				error: error.message,
				status: 404
			};
		}

		if (error instanceof QuestNotFoundError) {
			return {
				error: error.message,
				status: 404
			};
		}

		if (error instanceof NotAuthenticatedError || error instanceof NotOrganizerError) {
			return {
				error: error.message,
				status: 401
			};
		}

		console.error('Unexpected error:', error);
		return {
			error: 'Internal server error',
			status: 500
		};
	}
};
