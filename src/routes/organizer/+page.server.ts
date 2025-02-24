import { PostgresPointsRepo } from '$lib/server/points';
import { PostgresEventsRepo } from '$lib/server/events/postgres';
import type { PageHandler } from '$lib/server/endpoints/types';
import { composePage } from '$lib/server/endpoints';
import { withEventsService, type EventsServiceDep } from '$lib/server/endpoints/dependencies';

const loadHandler: PageHandler<EventsServiceDep> = async ({ eventsService: _ }) => {
	const pointsRepo = new PostgresPointsRepo();
	const eventsRepo = new PostgresEventsRepo();

	const [eventStats, pointsStats] = await Promise.all([
		eventsRepo.getEventStatistics(),
		pointsRepo.getPointsStatistics()
	]);

	return {
		eventStats,
		pointsStats
	};
};

export const load = composePage(withEventsService())(loadHandler);
