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

		// Get scrap details
		const scrap = await scrapperService.getScrapById(params.id);
		if (!scrap) {
			throw error(404, 'Scrap not found');
		}

		// Get session details
		const session = await scrapperService.getSessionById(scrap.sessionId);
		if (!session) {
			throw error(404, 'Session not found');
		}

		return {
			scrap,
			session
		};
	} catch (e) {
		console.error('Error loading scrap:', e);
		throw error(500, 'Failed to load scrap');
	}
};

export const load = composePage(
	withAuthProvider(),
	withScrapperService(),
	withRouteParams(routeSchema)
)(loadHandler);
