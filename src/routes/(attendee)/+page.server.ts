import { redirect } from '@sveltejs/kit';
import { PostgresEventsRepo } from '$lib/server/events/postgres';
import { PostgresPointsRepo } from '$lib/server/points';
import type { PointTransactionData } from '$lib/server/db/types';
import { ClerkAuthProvider } from '$lib/server/auth/clerk';

export const load = async ({ locals }) => {
	const authProvider = new ClerkAuthProvider(locals.auth);
	const userId = await authProvider.getUserId();
	const eventsRepo = new PostgresEventsRepo();
	const pointsRepo = new PostgresPointsRepo();

	if (!userId) {
		return redirect(302, '/login');
	}

	const [totalPoints, userRank, userTransactions, upcomingEvents, userEventStats] =
		await Promise.all([
			pointsRepo.getTotalPoints(userId),
			pointsRepo.getUserRank(userId),
			pointsRepo.getTransactionsByUser(userId),
			eventsRepo.getUpcomingEvents(userId),
			eventsRepo.getUserEventStatistics(userId)
		]);

	const recentTransactions = userTransactions
		.filter((tx: PointTransactionData) => tx.status === 'approved')
		.sort(
			(a: PointTransactionData, b: PointTransactionData) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		)
		.slice(0, 5);

	return {
		userStats: {
			totalPoints,
			leaderboardPosition: userRank.rank,
			totalParticipants: userRank.totalUsers,
			recentTransactions,
			eventsAttended: userEventStats.totalEventsAttended,
			attendanceRate: userEventStats.attendanceRate
		},
		upcomingEvents
	};
};
