import { composePage, type PageHandler } from '$lib/server/endpoints';
import {
	withAuthProvider,
	withScrapperService,
	type WithAuthProvider,
	type WithScrapperService
} from '$lib/server/endpoints/dependencies';
import { error } from '@sveltejs/kit';
import { withRouteParams } from '$lib/server/endpoints/validation';
import { z } from 'zod';

const routeSchema = z.object({
	id: z.coerce.number()
});

type LoadParams = WithAuthProvider &
	WithScrapperService & {
		params: z.infer<typeof routeSchema>;
	};

const loadHandler: PageHandler<LoadParams> = async ({ authProvider, scrapperService, params }) => {
	try {
		const userId = await authProvider.getUserId();
		if (!userId) {
			throw error(401, 'Unauthorized');
		}

		const user = await authProvider.getUserById(userId);
		if (!user?.isOrganizer) {
			throw error(403, 'Forbidden');
		}

		// Get session details
		const session = await scrapperService.getSessionById(params.id);
		if (!session) {
			throw error(404, 'Session not found');
		}

		// Get session stats and scraps
		const [totalPoints, scraps] = await Promise.all([
			scrapperService.getTotalPointsForSession(session.id),
			scrapperService.getSessionScraps(session.id)
		]);

		return {
			session,
			stats: {
				points: totalPoints
			},
			scraps
		};
	} catch (e) {
		console.error('Error loading session:', e);
		throw error(500, 'Failed to load session');
	}
};

export const load = composePage(
	withAuthProvider(),
	withScrapperService(),
	withRouteParams(routeSchema)
)(loadHandler);
