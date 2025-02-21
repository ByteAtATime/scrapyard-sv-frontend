import { db } from '../db';
import { pointTransactionsTable, usersTable } from '../db/schema';
import { eq, sql, and, not, sum, or, lt } from 'drizzle-orm';
import type {
	IPointsRepo,
	PointsStatistics,
	CreateTransactionData,
	ReviewTransactionData,
	LeaderboardEntry
} from './types';
import type { PointTransactionData } from '../db/types';
import type { PointTransaction } from './transaction';
import { Logger } from '../logging';
import { Cache } from '../cache';

export class PostgresPointsRepo implements IPointsRepo {
	private static TTL_MS = 5000; // 5 seconds
	private userPointsCache = new Cache<number, number>(PostgresPointsRepo.TTL_MS);
	private userTransactionsCache = new Cache<number, PointTransactionData[]>(
		PostgresPointsRepo.TTL_MS
	);
	private userRankCache = new Cache<number, { rank: number; totalUsers: number }>(
		PostgresPointsRepo.TTL_MS
	);
	private logger = new Logger('PointsRepo');

	async getTotalPoints(userId: number): Promise<number> {
		const cached = this.userPointsCache.get(userId);
		if (cached !== undefined) {
			this.logger.debug('Cache hit: getTotalPoints', { userId });
			return cached;
		}

		this.logger.debug('Cache miss: getTotalPoints', { userId });
		const result = await db
			.select({
				total: sql<number>`COALESCE(SUM(${pointTransactionsTable.amount}), 0)`
			})
			.from(pointTransactionsTable)
			.where(
				and(
					eq(pointTransactionsTable.userId, userId),
					not(eq(pointTransactionsTable.status, 'rejected')),
					not(eq(pointTransactionsTable.status, 'deleted'))
				)
			);
		const total = result[0]?.total ?? 0;
		this.userPointsCache.set(userId, total);
		return total;
	}

	async awardPoints(transaction: PointTransaction): Promise<number> {
		const [result] = await db
			.insert(pointTransactionsTable)
			.values({
				userId: transaction.userId,
				amount: transaction.amount,
				reason: transaction.reason,
				authorId: transaction.authorId,
				status: 'pending'
			})
			.returning({ id: pointTransactionsTable.id });

		return result.id;
	}

	async getTransactions(): Promise<PointTransactionData[]> {
		return await db.select().from(pointTransactionsTable).orderBy(pointTransactionsTable.createdAt);
	}

	async getTransactionsByUser(userId: number): Promise<PointTransactionData[]> {
		const cached = this.userTransactionsCache.get(userId);
		if (cached !== undefined) {
			this.logger.debug('Cache hit: getTransactionsByUser', { userId });
			return cached;
		}

		this.logger.debug('Cache miss: getTransactionsByUser', { userId });
		const transactions = await db
			.select()
			.from(pointTransactionsTable)
			.where(eq(pointTransactionsTable.userId, userId))
			.orderBy(pointTransactionsTable.createdAt);

		this.userTransactionsCache.set(userId, transactions);
		return transactions;
	}

	async createTransaction(data: CreateTransactionData): Promise<PointTransactionData> {
		this.logger.info('Creating transaction', { userId: data.userId, amount: data.amount });
		const [transaction] = await db.insert(pointTransactionsTable).values(data).returning();

		this.logger.debug('Invalidating caches after transaction creation', { userId: data.userId });
		this.userPointsCache.delete(data.userId);
		this.userTransactionsCache.delete(data.userId);
		this.userRankCache.delete(data.userId);
		return transaction;
	}

	async reviewTransaction(
		transactionId: number,
		data: ReviewTransactionData
	): Promise<PointTransactionData> {
		this.logger.info('Reviewing transaction', { transactionId, status: data.status });
		const [transaction] = await db
			.update(pointTransactionsTable)
			.set({
				status: data.status,
				reviewerId: data.reviewerId,
				reviewedAt: new Date(),
				rejectionReason: data.rejectionReason
			})
			.where(eq(pointTransactionsTable.id, transactionId))
			.returning();

		this.logger.debug('Invalidating caches after transaction review', {
			userId: transaction.userId
		});
		this.userPointsCache.delete(transaction.userId);
		this.userTransactionsCache.delete(transaction.userId);
		this.userRankCache.delete(transaction.userId);
		return transaction;
	}

	async getPendingTransactions(): Promise<PointTransactionData[]> {
		return await db
			.select()
			.from(pointTransactionsTable)
			.where(eq(pointTransactionsTable.status, 'pending'))
			.orderBy(pointTransactionsTable.createdAt);
	}

	async getTransactionById(id: number): Promise<PointTransactionData | null> {
		const transactions = await db
			.select()
			.from(pointTransactionsTable)
			.where(eq(pointTransactionsTable.id, id));
		return transactions[0] ?? null;
	}

	async getPointsStatistics(): Promise<PointsStatistics> {
		const users = await db
			.select({
				id: usersTable.id,
				name: usersTable.name,
				totalPoints: sql<number>`COALESCE((SELECT SUM(${pointTransactionsTable.amount}) FROM ${pointTransactionsTable} WHERE ${pointTransactionsTable.userId} = ${usersTable.id} AND ${pointTransactionsTable.status} NOT IN ('rejected', 'deleted')), 0)`
			})
			.from(usersTable);

		users.sort((a, b) => a.totalPoints - b.totalPoints);
		const topEarner = users[users.length - 1];

		const totalPointsAwarded = users.reduce((sum, user) => sum + user.totalPoints, 0);
		const averagePointsPerAttendee = users.length > 0 ? totalPointsAwarded / users.length : 0;

		return {
			totalPointsAwarded,
			averagePointsPerAttendee,
			topEarner: {
				userId: topEarner?.id ?? 0,
				name: topEarner?.name ?? '',
				totalPoints: topEarner?.totalPoints ?? 0
			}
		};
	}

	async getLeaderboard(): Promise<LeaderboardEntry[]> {
		const rawLeaderboard = await db
			.select({
				userId: usersTable.id,
				name: usersTable.name,
				totalPoints: sum(pointTransactionsTable.amount).mapWith(Number).as('totalPoints')
			})
			.from(usersTable)
			.innerJoin(pointTransactionsTable, eq(usersTable.id, pointTransactionsTable.userId))
			.where(
				or(
					eq(pointTransactionsTable.status, 'approved'),
					and(eq(pointTransactionsTable.status, 'pending'), lt(pointTransactionsTable.amount, 0))
				)
			)
			.groupBy(usersTable.id, usersTable.name)
			.orderBy(sql`"totalPoints" DESC`)
			.limit(10);

		const leaderboard: LeaderboardEntry[] = rawLeaderboard.map((user) => ({
			...user,
			transactions: []
		}));

		await Promise.all(
			leaderboard.map(async (user) => {
				const transactions = await db
					.select()
					.from(pointTransactionsTable)
					.where(
						and(
							eq(pointTransactionsTable.userId, user.userId),
							or(
								eq(pointTransactionsTable.status, 'approved'),
								and(
									eq(pointTransactionsTable.status, 'pending'),
									lt(pointTransactionsTable.amount, 0)
								)
							)
						)
					);
				user.transactions = transactions;
			})
		);

		leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
		return leaderboard;
	}

	async getUserRank(userId: number): Promise<{ rank: number; totalUsers: number }> {
		const cached = this.userRankCache.get(userId);
		if (cached !== undefined) {
			this.logger.debug('Cache hit: getUserRank', { userId });
			return cached;
		}

		this.logger.debug('Cache miss: getUserRank', { userId });
		const result = await db
			.select({
				rank: sql<number>`RANK() OVER (ORDER BY COALESCE(SUM(CASE WHEN ${pointTransactionsTable.status} NOT IN ('rejected', 'deleted') THEN ${pointTransactionsTable.amount} ELSE 0 END), 0) DESC)`,
				userId: usersTable.id,
				total: sql<number>`COUNT(*) OVER ()`
			})
			.from(usersTable)
			.leftJoin(pointTransactionsTable, eq(pointTransactionsTable.userId, usersTable.id))
			.groupBy(usersTable.id)
			.having(eq(usersTable.id, userId));

		const rank = {
			rank: result[0]?.rank ?? 0,
			totalUsers: result[0]?.total ?? 0
		};
		this.userRankCache.set(userId, rank);
		return rank;
	}
}
