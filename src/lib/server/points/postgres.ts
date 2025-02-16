import { db } from '../db';
import { pointTransactionsTable, usersTable } from '../db/schema';
import { eq, sql, and, not } from 'drizzle-orm';
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
		return result[0]?.total ?? 0;
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
}
