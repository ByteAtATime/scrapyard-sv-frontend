import type { EndpointHandler } from '$lib/server/endpoints';
import type { QuestService } from '$lib/server/quests/service';
import {
	QuestNotFoundError,
	TeamNotFoundError,
	NotTeamMemberError
} from '$lib/server/quests/types';
import { NotAuthenticatedError } from '$lib/server/points/types';
import { z } from 'zod';

export const postSubmissionSchema = z.object({
	questId: z.number().int().positive(),
	teamId: z.number().int().positive(),
	attachmentUrls: z.array(z.string().url()).min(1)
});

export const endpoint_POST: EndpointHandler<{
	questService: QuestService;
	body: z.infer<typeof postSubmissionSchema>;
}> = async ({ questService, body }) => {
	try {
		const submission = await questService.createQuestSubmission({
			questId: body.questId,
			teamId: body.teamId,
			attachmentUrls: body.attachmentUrls,
			submittedBy: 0 // This will be overridden by the service with the authenticated user
		});
		return submission;
	} catch (error) {
		if (error instanceof QuestNotFoundError) {
			return {
				error: error.message,
				status: 404
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
