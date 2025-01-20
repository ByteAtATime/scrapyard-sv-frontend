import { eq, sum } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { pointTransactionsTable } from '$lib/server/db/schema';
import type { IPointsRepository } from './types';
import type { PointTransaction } from './transaction';

export class PostgresPointsRepository implements IPointsRepository {
	async getTotalPoints(userId: number): Promise<number> {
		const result = await db
			.select({
				totalPoints: sum(pointTransactionsTable.amount).mapWith(Number)
			})
			.from(pointTransactionsTable)
			.where(eq(pointTransactionsTable.userId, userId));

		if (!result || result.length === 0 || !result[0].totalPoints) {
			throw new Error('User not found');
		}

		return result[0].totalPoints;
	}

	async awardPoints(transaction: PointTransaction): Promise<number> {
		const result = await db
			.insert(pointTransactionsTable)
			.values({
				userId: transaction.userId,
				amount: transaction.amount,
				reason: transaction.reason,
				authorId: transaction.authorId
			})
			.returning();
		return result[0].id;
	}
}
