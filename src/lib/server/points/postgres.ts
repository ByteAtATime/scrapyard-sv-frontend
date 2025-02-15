import { db } from '../db';
import { pointTransactionsTable, usersTable } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import type {
	IPointsRepo,
	PointsStatistics,
	CreateTransactionData,
	ReviewTransactionData
} from './types';
import type { PointTransactionData } from '../db/types';
import type { PointTransaction } from './transaction';

export class PostgresPointsRepo implements IPointsRepo {
	async getTotalPoints(userId: number): Promise<number> {
		const users = await db.select().from(usersTable).where(eq(usersTable.id, userId));
		return users[0]?.totalPoints ?? 0;
	}

	async awardPoints(transaction: PointTransaction): Promise<number> {
		const [result] = await db
			.insert(pointTransactionsTable)
			.values({
				userId: transaction.userId,
				amount: transaction.amount,
				reason: transaction.reason,
				authorId: transaction.authorId,
				status: 'approved'
			})
			.returning({ id: pointTransactionsTable.id });

		await db
			.update(usersTable)
			.set({
				totalPoints: sql`${usersTable.totalPoints} + ${transaction.amount}`
			})
			.where(eq(usersTable.id, transaction.userId));

		return result.id;
	}

	async getTransactions(): Promise<PointTransactionData[]> {
		return await db.select().from(pointTransactionsTable).orderBy(pointTransactionsTable.createdAt);
	}

	async getTransactionsByUser(userId: number): Promise<PointTransactionData[]> {
		return await db
			.select()
			.from(pointTransactionsTable)
			.where(eq(pointTransactionsTable.userId, userId))
			.orderBy(pointTransactionsTable.createdAt);
	}

	async createTransaction(data: CreateTransactionData): Promise<PointTransactionData> {
		const [transaction] = await db.insert(pointTransactionsTable).values(data).returning();
		return transaction;
	}

	async reviewTransaction(
		transactionId: number,
		data: ReviewTransactionData
	): Promise<PointTransactionData> {
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

		if (data.status === 'approved') {
			await db
				.update(usersTable)
				.set({
					totalPoints: sql`${usersTable.totalPoints} + (
						SELECT amount FROM ${pointTransactionsTable}
						WHERE id = ${transactionId}
					)`
				})
				.where(eq(usersTable.id, transaction.userId));
		}

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
				totalPoints: usersTable.totalPoints,
				name: usersTable.name,
				id: usersTable.id
			})
			.from(usersTable)
			.orderBy(usersTable.totalPoints);

		const topEarner = users[users.length - 1];

		return {
			totalPointsAwarded: users.reduce((sum, user) => sum + user.totalPoints, 0),
			averagePointsPerAttendee:
				users.length > 0
					? users.reduce((sum, user) => sum + user.totalPoints, 0) / users.length
					: 0,
			topEarner: {
				userId: topEarner?.id ?? 0,
				name: topEarner?.name ?? '',
				totalPoints: topEarner?.totalPoints ?? 0
			}
		};
	}
}
