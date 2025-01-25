import { eq, sum, sql, and, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { pointTransactionsTable, usersTable } from '$lib/server/db/schema';
import type { IPointsRepository, ReviewTransactionOptions, ReviewTransactionResult } from './types';
import { alias } from 'drizzle-orm/pg-core';
import type { PointTransactionData } from '../db/types';
import type { PointTransaction } from './transaction';

export class PostgresPointsRepository implements IPointsRepository {
	async getPoints(userId: number): Promise<number> {
		const result = await db
			.select({
				totalPoints: sum(pointTransactionsTable.amount).mapWith(Number)
			})
			.from(pointTransactionsTable)
			.where(
				and(
					eq(pointTransactionsTable.userId, userId),
					ne(pointTransactionsTable.status, 'rejected')
				)
			);

		if (!result[0] || result[0].totalPoints === null) {
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
			.returning({ id: pointTransactionsTable.id });

		return result[0].id;
	}

	async getTransactions(): Promise<PointTransactionData[]> {
		const userAlias = alias(usersTable, 'user');
		const authorAlias = alias(usersTable, 'author');
		const reviewerAlias = alias(usersTable, 'reviewer');

		const transactions = await db
			.select({
				id: pointTransactionsTable.id,
				userId: pointTransactionsTable.userId,
				amount: pointTransactionsTable.amount,
				reason: pointTransactionsTable.reason,
				authorId: pointTransactionsTable.authorId,
				createdAt: pointTransactionsTable.createdAt,
				status: pointTransactionsTable.status,
				reviewerId: pointTransactionsTable.reviewerId,
				reviewedAt: pointTransactionsTable.reviewedAt,
				rejectionReason: pointTransactionsTable.rejectionReason,
				user: {
					id: userAlias.id,
					name: userAlias.name,
					email: userAlias.email
				},
				author: {
					id: authorAlias.id,
					name: authorAlias.name,
					email: authorAlias.email
				},
				reviewer: {
					id: reviewerAlias.id,
					name: reviewerAlias.name,
					email: reviewerAlias.email
				}
			})
			.from(pointTransactionsTable)
			.innerJoin(userAlias, eq(pointTransactionsTable.userId, userAlias.id))
			.innerJoin(authorAlias, eq(pointTransactionsTable.authorId, authorAlias.id))
			.leftJoin(reviewerAlias, eq(pointTransactionsTable.reviewerId, reviewerAlias.id))
			.orderBy(sql`${pointTransactionsTable.createdAt} DESC`);

		return transactions.map((t) => ({
			id: t.id,
			userId: t.userId,
			amount: t.amount,
			reason: t.reason,
			authorId: t.authorId,
			createdAt: t.createdAt,
			status: t.status,
			reviewerId: t.reviewerId,
			reviewedAt: t.reviewedAt,
			rejectionReason: t.rejectionReason,
			user: {
				id: t.user.id,
				name: t.user.name,
				email: t.user.email
			},
			author: {
				id: t.author.id,
				name: t.author.name,
				email: t.author.email
			},
			reviewer:
				t.reviewer && t.reviewer.id
					? {
							id: t.reviewer.id,
							name: t.reviewer.name,
							email: t.reviewer.email
						}
					: undefined
		}));
	}

	async reviewTransaction(options: ReviewTransactionOptions): Promise<ReviewTransactionResult> {
		const transaction = await db.query.pointTransactionsTable.findFirst({
			where: eq(pointTransactionsTable.id, options.transactionId)
		});

		if (!transaction) {
			return {
				success: false,
				error: 'Transaction not found'
			};
		}

		if (transaction.status !== 'pending') {
			return {
				success: false,
				error: 'Transaction has already been reviewed'
			};
		}

		await db
			.update(pointTransactionsTable)
			.set({
				status: options.status,
				reviewerId: options.reviewerId,
				reviewedAt: new Date(),
				rejectionReason: options.rejectionReason ?? null
			})
			.where(eq(pointTransactionsTable.id, options.transactionId));

		return { success: true };
	}
}
