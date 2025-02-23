import { PostgresEventsRepo } from '$lib/server/events/postgres';
import { PostgresPointsRepo } from '$lib/server/points';

export async function load() {
	const eventsRepo = new PostgresEventsRepo();
	const pointsRepo = new PostgresPointsRepo();

	const [eventStats, pointsStats] = await Promise.all([
		eventsRepo.getEventStatistics(),
		pointsRepo.getPointsStatistics()
	]);

	return {
		eventStats,
		pointsStats
	};
}
