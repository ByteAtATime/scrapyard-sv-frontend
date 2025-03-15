import type { EndpointHandler } from '$lib/server/endpoints';
import type { QuestService } from '$lib/server/quests/service';
import { QuestSubmissionNotFoundError } from '$lib/server/quests/types';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/points/types';
import { z } from 'zod';

export const reviewSubmissionSchema = z.object({
	status: z.enum(['approved', 'rejected']),
	rejectionReason: z.string().optional()
});

export const endpoint_GET: EndpointHandler<{
	questService: QuestService;
	params: { id: string };
}> = async ({ questService, params }) => {
	try {
		const submissionId = parseInt(params.id);
		const submission = await questService.getQuestSubmissionById(submissionId);
		return submission;
	} catch (error) {
		if (error instanceof QuestSubmissionNotFoundError) {
			return {
				error: error.message,
				status: 404
			};
		}

		if (error instanceof NotAuthenticatedError) {
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

export const endpoint_POST: EndpointHandler<{
	questService: QuestService;
	params: { id: string };
	body: z.infer<typeof reviewSubmissionSchema>;
}> = async ({ questService, params, body }) => {
	try {
		const submissionId = parseInt(params.id);

		// reviewerId is handled by the service
		const submission = await questService.reviewQuestSubmission(submissionId, {
			status: body.status,
			rejectionReason: body.rejectionReason,
			reviewerId: 0 // This will be overridden by the service with the authenticated user
		});

		return submission;
	} catch (error) {
		if (error instanceof QuestSubmissionNotFoundError) {
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
