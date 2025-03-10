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

		// Get recent scraps with pagination
		const scraps = await scrapperService.getRecentScraps(query.pageSize);

		// Get total scraps count for today and this week
		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
		startOfWeek.setHours(0, 0, 0, 0);

		const [todayCount, weekCount] = await Promise.all([
			scrapperService.getScrapCountSince(startOfToday),
			scrapperService.getScrapCountSince(startOfWeek)
		]);

		return {
			scraps,
			stats: {
				todayCount,
				weekCount
			}
		};
	} catch (e) {
		console.error('Error loading scraps:', e);
		throw error(500, 'Failed to load scraps');
	}
};

export const load = composePage(
	withAuthProvider(),
	withScrapperService(),
	withQuerySchema(querySchema)
)(loadHandler);
