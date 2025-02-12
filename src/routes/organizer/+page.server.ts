import { eventsRepo } from '$lib/server/events';
import { pointsRepo } from '$lib/server/points';

export async function load() {
	const [eventStats, pointsStats] = await Promise.all([
		eventsRepo.getEventStatistics(),
		pointsRepo.getPointsStatistics()
	]);

	return {
		eventStats,
		pointsStats
	};
}
