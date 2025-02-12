import { eq, sum, sql, and, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	eventAttendanceTable,
	eventsTable,
	pointTransactionsTable,
	usersTable
} from '$lib/server/db/schema';
import type {
	IPointsRepo,
	PointsStatistics,
	ReviewTransactionOptions,
	ReviewTransactionResult
} from './types';
import { alias } from 'drizzle-orm/pg-core';
import type { PointTransactionData } from '../db/types';
import type { PointTransaction, PointTransactionJson } from './transaction';

export class PostgresPointsRepo implements IPointsRepo {
	async getTotalPoints(userId: number): Promise<number> {
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

	async getTransactionsByUser(userId: number): Promise<PointTransactionJson[]> {
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
			.where(eq(pointTransactionsTable.userId, userId))
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
					: null
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

		if (options.status === 'deleted' && transaction.status === 'deleted') {
			return {
				success: false,
				error: 'Transaction has already been deleted'
			};
		}

		if (transaction.status !== 'pending' && options.status !== 'deleted') {
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

	async getPointsStatistics(): Promise<PointsStatistics> {
		const [pointsResult, topEarnerResult] = await Promise.all([
			db
				.select({
					totalPointsAwarded: sql<number>`COALESCE(SUM(${pointTransactionsTable.amount}), 0)`,
					totalAttendees: sql<number>`COUNT(DISTINCT ${eventAttendanceTable.userId})`
				})
				.from(eventsTable)
				.leftJoin(eventAttendanceTable, sql`${eventsTable.id} = ${eventAttendanceTable.eventId}`)
				.leftJoin(
					pointTransactionsTable,
					sql`${pointTransactionsTable.reason} LIKE 'Attended event:%' AND ${pointTransactionsTable.status} = 'approved'`
				),
			db
				.select({
					userId: usersTable.id,
					name: usersTable.name,
					totalPoints: usersTable.totalPoints
				})
				.from(usersTable)
				.orderBy(sql`${usersTable.totalPoints} DESC`)
				.limit(1)
		]);

		const stats = pointsResult[0];
		const topEarner = topEarnerResult[0];
		const totalPoints = Number(stats.totalPointsAwarded);
		const totalAttendees = Number(stats.totalAttendees);

		return {
			totalPointsAwarded: totalPoints,
			averagePointsPerAttendee: totalAttendees > 0 ? totalPoints / totalAttendees : 0,
			topEarner: {
				userId: topEarner.userId,
				name: topEarner.name,
				totalPoints: topEarner.totalPoints
			}
		};
	}
}
