import type { EndpointHandler } from '$lib/server/endpoints';
import type { QuestService } from '$lib/server/quests/service';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/points/types';
import { z } from 'zod';

export const postQuestSchema = z.object({
	name: z.string().min(1),
	description: z.string(),
	totalPoints: z.number().int().positive(),
	endTime: z.coerce.date()
});

export const postSubmissionSchema = z.object({
	questId: z.number().int().positive(),
	teamId: z.number().int().positive(),
	attachmentUrls: z.array(z.string().url()).min(1)
});

export const reviewSubmissionSchema = z.object({
	status: z.enum(['approved', 'rejected']),
	rejectionReason: z.string().optional()
});

export const endpoint_GET: EndpointHandler<{
	questService: QuestService;
}> = async ({ questService }) => {
	try {
		const quests = await questService.getQuests();
		return quests;
	} catch (error) {
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
	body: z.infer<typeof postQuestSchema>;
}> = async ({ questService, body }) => {
	try {
		const quest = await questService.createQuest(body);
		return quest;
	} catch (error) {
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
