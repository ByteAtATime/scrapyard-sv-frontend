import { composePage, type PageHandler } from '$lib/server/endpoints';
import {
	withAuthProvider,
	withScrapperService,
	type WithAuthProvider,
	type WithScrapperService
} from '$lib/server/endpoints/dependencies';
import { error } from '@sveltejs/kit';

const loadHandler: PageHandler<WithAuthProvider & WithScrapperService> = async ({
	authProvider,
	scrapperService
}) => {
	try {
		const userId = await authProvider.getUserId();
		if (!userId) {
			throw error(401, 'Unauthorized');
		}

		const user = await authProvider.getUserById(userId);
		if (!user?.isOrganizer) {
			throw error(403, 'Forbidden');
		}

		// Get today's stats
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);

		const [activeSessions, todayScraps, todayVotes, recentSessions, recentScraps] =
			await Promise.all([
				scrapperService.getActiveSessionCount(),
				scrapperService.getScrapCountSince(startOfDay),
				scrapperService.getVoteCountSince(startOfDay),
				scrapperService.getRecentSessions(10),
				scrapperService.getRecentScraps(10)
			]);

		return {
			stats: {
				activeSessions,
				todayScraps,
				todayVotes
			},
			recentSessions,
			recentScraps
		};
	} catch (e) {
		console.error('Error loading organizer dashboard:', e);
		throw error(500, 'Failed to load organizer dashboard');
	}
};

export const load = composePage(withAuthProvider(), withScrapperService())(loadHandler);
