import type { EndpointHandler } from '$lib/server/endpoints';
import type { QuestService } from '$lib/server/quests/service';
import { QuestNotFoundError } from '$lib/server/quests/types';
import { NotAuthenticatedError, NotOrganizerError } from '$lib/server/points/types';
import { z } from 'zod';

export const putQuestSchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	totalPoints: z.number().int().positive().optional(),
	endTime: z.coerce.date().optional(),
	status: z.enum(['active', 'completed', 'cancelled']).optional()
});

export const endpoint_GET: EndpointHandler<{
	questService: QuestService;
	params: { id: string };
}> = async ({ questService, params }) => {
	try {
		const questId = parseInt(params.id);
		const quest = await questService.getQuestById(questId);
		return quest;
	} catch (error) {
		if (error instanceof QuestNotFoundError) {
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

export const endpoint_PUT: EndpointHandler<{
	questService: QuestService;
	params: { id: string };
	body: z.infer<typeof putQuestSchema>;
}> = async ({ questService, params, body }) => {
	try {
		const questId = parseInt(params.id);
		const quest = await questService.updateQuest(questId, body);
		return quest;
	} catch (error) {
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

export const endpoint_DELETE: EndpointHandler<{
	questService: QuestService;
	params: { id: string };
}> = async ({ questService, params }) => {
	try {
		const questId = parseInt(params.id);
		await questService.deleteQuest(questId);
		return { success: true };
	} catch (error) {
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
