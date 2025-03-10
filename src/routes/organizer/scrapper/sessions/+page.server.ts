import { composePage, type PageHandler } from '$lib/server/endpoints';
import {
	withAuthProvider,
	withScrapperService,
	type WithAuthProvider,
	type WithScrapperService
} from '$lib/server/endpoints/dependencies';
import { error } from '@sveltejs/kit';
import { withQuerySchema } from '$lib/server/endpoints/validation';
import { z } from 'zod';

const querySchema = z.object({
	page: z.coerce.number().optional().default(1),
	pageSize: z.coerce.number().optional().default(20),
	status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
	search: z.string().optional()
});

type LoadParams = WithAuthProvider &
	WithScrapperService & {
		query: z.infer<typeof querySchema>;
	};

const loadHandler: PageHandler<LoadParams> = async ({ authProvider, scrapperService, query }) => {
	try {
		const userId = await authProvider.getUserId();
		if (!userId) {
			throw error(401, 'Unauthorized');
		}

		const user = await authProvider.getUserById(userId);
		if (!user?.isOrganizer) {
			throw error(403, 'Forbidden');
		}

		// Get query parameters with defaults already applied by Zod
		const { page, pageSize, status, search } = query;

		// Load data in parallel using Promise.allSettled
		const [
			sessionsResult,
			totalResult,
			activeResult,
			pausedResult,
			completedResult,
			cancelledResult
		] = await Promise.allSettled([
			scrapperService.getSessions({ page, pageSize, status, search }),
			scrapperService.getSessionCount({ status, search }),
			scrapperService.getSessionCount({ status: 'active', search }),
			scrapperService.getSessionCount({ status: 'paused', search }),
			scrapperService.getSessionCount({ status: 'completed', search }),
			scrapperService.getSessionCount({ status: 'cancelled', search })
		]);

		// Handle potential failures
		const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : [];
		const total = totalResult.status === 'fulfilled' ? totalResult.value : 0;
		const statusCounts = {
			active: activeResult.status === 'fulfilled' ? activeResult.value : 0,
			paused: pausedResult.status === 'fulfilled' ? pausedResult.value : 0,
			completed: completedResult.status === 'fulfilled' ? completedResult.value : 0,
			cancelled: cancelledResult.status === 'fulfilled' ? cancelledResult.value : 0
		};

		// Load session stats in parallel
		const sessionStats = await Promise.all(
			sessions.map(async (session) => {
				const [totalPoints] = await Promise.all([
					scrapperService.getTotalPointsForSession(session.id)
				]);
				return {
					points: totalPoints
				};
			})
		);

		return {
			sessions,
			sessionStats: Object.fromEntries(sessions.map((session, i) => [session.id, sessionStats[i]])),
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize)
			},
			filters: {
				status,
				search
			},
			statusCounts
		};
	} catch (e) {
		console.error('Error loading sessions:', e);
		throw error(500, 'Failed to load sessions');
	}
};

export const load = composePage(
	withAuthProvider(),
	withScrapperService(),
	withQuerySchema(querySchema)
)(loadHandler);
