import type { EndpointHandler } from '$lib/server/endpoints';
import type { IPointsRepo } from '$lib/server/points/types';

export const endpoint_GET: EndpointHandler<{ pointsRepo: IPointsRepo }> = async ({
	pointsRepo
}) => {
	const leaderboard = await pointsRepo.getLeaderboard();
	return leaderboard;
};
