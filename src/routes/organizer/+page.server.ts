import { eventsRepository } from '$lib/server/events';
import { pointsRepository } from '$lib/server/points';

export async function load() {
	const [eventStats, pointsStats] = await Promise.all([
		eventsRepository.getEventStatistics(),
		pointsRepository.getPointsStatistics()
	]);

	return {
		eventStats,
		pointsStats
	};
}
