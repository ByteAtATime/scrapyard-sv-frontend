import { and, eq, or, sql, not, exists, desc, ne, gt } from 'drizzle-orm';
import { db } from '../db';
import {
	scrapperSessionsTable,
	scrapsTable,
	scrapVotesTable,
	pointTransactionsTable,
	usersTable
} from '../db/schema';
import { sql as drizzleSql } from 'drizzle-orm';
import type { IScrapperRepo } from './types';
import type { SessionData as DBSessionData } from '../db/types';
import type {
	SessionData,
	ScrapData,
	CreateScrapInput,
	VoteData,
	SessionWithUser,
	ScrapWithUser,
	SessionFilters,
	VoteFilters,
	VoteWithUser,
	VoteStats,
	UserVotingActivity
} from './types';

const DEFAULT_POINTS_PER_HOUR = 10;

export class PostgresScrapperRepo implements IScrapperRepo {
	private convertToSessionData(
		dbSession: DBSessionData & { totalPausedSeconds: number }
	): SessionData {
		return {
			id: dbSession.id,
			userId: dbSession.userId,
			status: dbSession.status,
			startTime: dbSession.startTime,
			lastPausedAt: dbSession.lastPausedAt,
			totalPausedSeconds: dbSession.totalPausedSeconds,
			completedAt: dbSession.endTime,
			pointsPerHour: DEFAULT_POINTS_PER_HOUR
		};
	}

	public async getSession(userId: number): Promise<DBSessionData | null> {
		const [session] = await db
			.select()
			.from(scrapperSessionsTable)
			.where(
				and(eq(scrapperSessionsTable.userId, userId), eq(scrapperSessionsTable.status, 'active'))
			);

		if (session) {
			// Get totalPausedSeconds as a separate query
			const [{ totalPausedSeconds }] = await db
				.select({
					totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
				})
				.from(scrapperSessionsTable)
				.where(eq(scrapperSessionsTable.id, session.id));

			return { ...session, totalPausedSeconds };
		}

		return null;
	}

	public async getCurrentSession(userId: number): Promise<DBSessionData | null> {
		const [session] = await db
			.select()
			.from(scrapperSessionsTable)
			.where(
				and(
					eq(scrapperSessionsTable.userId, userId),
					or(eq(scrapperSessionsTable.status, 'active'), eq(scrapperSessionsTable.status, 'paused'))
				)
			);

		if (session) {
			// Get totalPausedSeconds as a separate query
			const [{ totalPausedSeconds }] = await db
				.select({
					totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
				})
				.from(scrapperSessionsTable)
				.where(eq(scrapperSessionsTable.id, session.id));

			return { ...session, totalPausedSeconds };
		}

		return null;
	}

	public async createSession(userId: number): Promise<DBSessionData> {
		const [session] = await db
			.insert(scrapperSessionsTable)
			.values({
				userId,
				status: 'active',
				totalPausedTime: '0 seconds'
			})
			.returning();

		// Add totalPausedSeconds (should be 0 for a new session)
		return { ...session, totalPausedSeconds: 0 };
	}

	public async pauseSession(sessionId: number): Promise<DBSessionData> {
		const [session] = await db
			.select()
			.from(scrapperSessionsTable)
			.where(eq(scrapperSessionsTable.id, sessionId));

		if (!session) {
			throw new Error(`Session with ID ${sessionId} not found`);
		}

		// Get the current time for pausing
		const currentTime = new Date();

		// Set the lastPausedAt timestamp to the current time
		const [updatedSession] = await db
			.update(scrapperSessionsTable)
			.set({
				status: 'paused',
				lastPausedAt: currentTime,
				updatedAt: currentTime
			})
			.where(eq(scrapperSessionsTable.id, sessionId))
			.returning();

		// Get totalPausedSeconds as a separate query
		const [{ totalPausedSeconds }] = await db
			.select({
				totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
			})
			.from(scrapperSessionsTable)
			.where(eq(scrapperSessionsTable.id, updatedSession.id));

		return { ...updatedSession, totalPausedSeconds };
	}

	public async resumeSession(sessionId: number): Promise<DBSessionData> {
		const [session] = await db
			.select()
			.from(scrapperSessionsTable)
			.where(eq(scrapperSessionsTable.id, sessionId));

		if (!session) {
			throw new Error(`Session with ID ${sessionId} not found`);
		}

		const currentTime = new Date();

		if (session.lastPausedAt) {
			const pausedMs = currentTime.getTime() - new Date(session.lastPausedAt).getTime();
			const pausedSeconds = Math.floor(pausedMs / 1000);
			const pauseIntervalStr = `${pausedSeconds} seconds`;

			const [updatedSession] = await db
				.update(scrapperSessionsTable)
				.set({
					status: 'active',
					totalPausedTime: drizzleSql`${scrapperSessionsTable.totalPausedTime} + (${pauseIntervalStr}::interval)`,
					lastPausedAt: null,
					updatedAt: currentTime
				})
				.where(eq(scrapperSessionsTable.id, sessionId))
				.returning();

			const [{ totalPausedSeconds }] = await db
				.select({
					totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
				})
				.from(scrapperSessionsTable)
				.where(eq(scrapperSessionsTable.id, sessionId));

			return { ...updatedSession, totalPausedSeconds };
		} else {
			const [updatedSession] = await db
				.update(scrapperSessionsTable)
				.set({
					status: 'active',
					lastPausedAt: null,
					updatedAt: currentTime
				})
				.where(eq(scrapperSessionsTable.id, sessionId))
				.returning();

			const [{ totalPausedSeconds }] = await db
				.select({
					totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
				})
				.from(scrapperSessionsTable)
				.where(eq(scrapperSessionsTable.id, sessionId));

			return { ...updatedSession, totalPausedSeconds };
		}
	}

	public async completeSession(sessionId: number): Promise<DBSessionData> {
		const [session] = await db
			.select()
			.from(scrapperSessionsTable)
			.where(eq(scrapperSessionsTable.id, sessionId));

		if (!session) {
			throw new Error(`Session with ID ${sessionId} not found`);
		}

		const currentTime = new Date();

		// Handle the case where the session is paused - add the additional pause time
		if (session.status === 'paused' && session.lastPausedAt) {
			// Calculate the pause duration since lastPausedAt
			const pausedMs = currentTime.getTime() - new Date(session.lastPausedAt).getTime();
			const pausedSeconds = Math.floor(pausedMs / 1000);
			const pauseIntervalStr = `${pausedSeconds} seconds`;

			console.log('Completing paused session, adding interval:', {
				lastPausedAt: session.lastPausedAt,
				currentTime,
				pausedSeconds,
				pauseIntervalStr
			});

			const [updatedSession] = await db
				.update(scrapperSessionsTable)
				.set({
					status: 'completed',
					endTime: currentTime,
					totalPausedTime: drizzleSql`${scrapperSessionsTable.totalPausedTime} + (${pauseIntervalStr}::interval)`,
					updatedAt: currentTime
				})
				.where(eq(scrapperSessionsTable.id, sessionId))
				.returning();

			// Get totalPausedSeconds as a separate query
			const [{ totalPausedSeconds }] = await db
				.select({
					totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
				})
				.from(scrapperSessionsTable)
				.where(eq(scrapperSessionsTable.id, updatedSession.id));

			// Calculate session duration in hours
			const durationMs = currentTime.getTime() - updatedSession.startTime.getTime();
			const durationSeconds = Math.floor(durationMs / 1000) - totalPausedSeconds;
			const durationHours = Math.max(0, durationSeconds / 3600);

			// Award points based on duration
			const points = Math.floor(durationHours * DEFAULT_POINTS_PER_HOUR);
			if (points > 0) {
				await db
					.insert(pointTransactionsTable)
					.values({
						userId: updatedSession.userId,
						amount: points,
						reason: `Completed scrapping session (${Math.floor(durationHours)} hours)`,
						authorId: updatedSession.userId, // Self-awarded
						status: 'approved' // Auto-approve session points
					})
					.returning();
			}

			return { ...updatedSession, totalPausedSeconds };
		} else {
			// For active sessions, just mark as completed
			const [updatedSession] = await db
				.update(scrapperSessionsTable)
				.set({
					status: 'completed',
					endTime: currentTime,
					updatedAt: currentTime
				})
				.where(eq(scrapperSessionsTable.id, sessionId))
				.returning();

			// Get totalPausedSeconds as a separate query
			const [{ totalPausedSeconds }] = await db
				.select({
					totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
				})
				.from(scrapperSessionsTable)
				.where(eq(scrapperSessionsTable.id, updatedSession.id));

			// Calculate session duration in hours
			const durationMs = currentTime.getTime() - updatedSession.startTime.getTime();
			const durationSeconds = Math.floor(durationMs / 1000) - totalPausedSeconds;
			const durationHours = Math.max(0, durationSeconds / 3600);

			// Award points based on duration
			const points = Math.floor(durationHours * DEFAULT_POINTS_PER_HOUR);
			if (points > 0) {
				await db
					.insert(pointTransactionsTable)
					.values({
						userId: updatedSession.userId,
						amount: points,
						reason: `Completed scrapping session (${Math.floor(durationHours)} hours)`,
						authorId: updatedSession.userId, // Self-awarded
						status: 'approved' // Auto-approve session points
					})
					.returning();
			}

			return { ...updatedSession, totalPausedSeconds };
		}
	}

	public async cancelSession(sessionId: number): Promise<DBSessionData> {
		const [updatedSession] = await db
			.update(scrapperSessionsTable)
			.set({
				status: 'cancelled',
				endTime: new Date(),
				updatedAt: new Date()
			})
			.where(eq(scrapperSessionsTable.id, sessionId))
			.returning();

		// Get totalPausedSeconds as a separate query
		const [{ totalPausedSeconds }] = await db
			.select({
				totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
			})
			.from(scrapperSessionsTable)
			.where(eq(scrapperSessionsTable.id, updatedSession.id));

		return { ...updatedSession, totalPausedSeconds };
	}

	public async getSessionById(sessionId: number): Promise<DBSessionData | null> {
		const [session] = await db
			.select()
			.from(scrapperSessionsTable)
			.where(eq(scrapperSessionsTable.id, sessionId));

		if (session) {
			// Get totalPausedSeconds as a separate query
			const [{ totalPausedSeconds }] = await db
				.select({
					totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
				})
				.from(scrapperSessionsTable)
				.where(eq(scrapperSessionsTable.id, session.id));

			return { ...session, totalPausedSeconds };
		}

		return null;
	}

	public async updateSession(id: number, data: Partial<DBSessionData>): Promise<DBSessionData> {
		const [updatedSession] = await db
			.update(scrapperSessionsTable)
			.set({
				...data,
				updatedAt: new Date()
			})
			.where(eq(scrapperSessionsTable.id, id))
			.returning();

		// Get totalPausedSeconds as a separate query
		const [{ totalPausedSeconds }] = await db
			.select({
				totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
			})
			.from(scrapperSessionsTable)
			.where(eq(scrapperSessionsTable.id, updatedSession.id));

		return { ...updatedSession, totalPausedSeconds };
	}

	public async createScrap(
		input: { userId: number; sessionId: number } & Omit<CreateScrapInput, 'userId' | 'sessionId'>
	): Promise<ScrapData> {
		const [scrap] = await db
			.insert(scrapsTable)
			.values({
				sessionId: input.sessionId,
				title: input.title,
				description: input.description,
				attachmentUrls: input.attachmentUrls,
				basePoints: input.points,
				totalPoints: input.points // Initially, total points equals base points
			})
			.returning();

		return {
			id: scrap.id,
			userId: input.userId,
			sessionId: scrap.sessionId,
			title: scrap.title,
			description: scrap.description,
			attachmentUrls: scrap.attachmentUrls,
			points: scrap.totalPoints,
			createdAt: scrap.createdAt
		};
	}

	public async getRandomScrapsForVoting(
		userId: number,
		_limit: number
	): Promise<[ScrapData, ScrapData]> {
		// Get two random scraps that:
		// 1. Are not created by the user
		// 2. Are from completed sessions
		// 3. Haven't been voted on by the user
		const scraps = await db
			.select({
				id: scrapsTable.id,
				sessionId: scrapsTable.sessionId,
				title: scrapsTable.title,
				description: scrapsTable.description,
				attachmentUrls: scrapsTable.attachmentUrls,
				basePoints: scrapsTable.basePoints,
				totalPoints: scrapsTable.totalPoints,
				createdAt: scrapsTable.createdAt,
				updatedAt: scrapsTable.updatedAt,
				userId: scrapperSessionsTable.userId
			})
			.from(scrapsTable)
			.innerJoin(scrapperSessionsTable, eq(scrapsTable.sessionId, scrapperSessionsTable.id))
			.where(
				and(
					ne(scrapperSessionsTable.userId, userId),
					eq(scrapperSessionsTable.status, 'completed'),
					not(
						exists(
							db
								.select()
								.from(scrapVotesTable)
								.where(
									and(
										eq(scrapVotesTable.voterId, userId),
										eq(scrapVotesTable.scrapId, scrapsTable.id)
									)
								)
						)
					)
				)
			)
			.orderBy(sql`RANDOM()`)
			.limit(2);

		if (scraps.length < 2) {
			throw new Error('Not enough scraps available for voting');
		}

		return [this.convertToScrapData(scraps[0]), this.convertToScrapData(scraps[1])];
	}

	private convertToScrapData(
		scrap: typeof scrapsTable.$inferSelect & { userId: number }
	): ScrapData {
		return {
			id: scrap.id,
			userId: scrap.userId,
			sessionId: scrap.sessionId,
			title: scrap.title,
			description: scrap.description,
			attachmentUrls: scrap.attachmentUrls,
			points: scrap.totalPoints,
			createdAt: scrap.createdAt
		};
	}

	public async createVote(input: {
		userId: number;
		scrapId: number;
		otherScrapId: number;
		voterTransactionId?: number;
		creatorTransactionId?: number;
	}): Promise<VoteData> {
		const [vote] = await db.transaction(async (tx) => {
			const [vote] = await tx
				.insert(scrapVotesTable)
				.values({
					voterId: input.userId,
					scrapId: input.scrapId,
					otherScrapId: input.otherScrapId,
					pointsAwarded: 0,
					voterTransactionId: input.voterTransactionId,
					transactionId: input.creatorTransactionId
				})
				.returning();
			return [vote];
		});

		return {
			id: vote.id,
			userId: vote.voterId,
			scrapId: vote.scrapId,
			otherScrapId: input.otherScrapId,
			points: 0,
			createdAt: vote.createdAt,
			voterTransactionId: vote.voterTransactionId || undefined,
			creatorTransactionId: vote.transactionId || undefined
		};
	}

	public async getVoteRecord(voteId: number): Promise<{
		id: number;
		voterId: number;
		scrapId: number;
		otherScrapId: number;
		pointsAwarded: number;
		createdAt: Date;
		voterTransactionId?: number;
		creatorTransactionId?: number;
	} | null> {
		const [vote] = await db.select().from(scrapVotesTable).where(eq(scrapVotesTable.id, voteId));

		if (!vote) return null;

		return {
			id: vote.id,
			voterId: vote.voterId,
			scrapId: vote.scrapId,
			otherScrapId: vote.otherScrapId,
			pointsAwarded: vote.pointsAwarded,
			createdAt: vote.createdAt,
			voterTransactionId: vote.voterTransactionId || undefined,
			creatorTransactionId: vote.transactionId || undefined
		};
	}

	public async updateScrapPoints(scrapId: number, points: number): Promise<ScrapData> {
		const [scrap] = await db
			.update(scrapsTable)
			.set({
				totalPoints: sql`${scrapsTable.totalPoints} + ${points}`,
				updatedAt: new Date()
			})
			.where(eq(scrapsTable.id, scrapId))
			.returning();

		return {
			id: scrap.id,
			userId: scrap.sessionId, // Get userId from session
			sessionId: scrap.sessionId,
			title: scrap.title,
			description: scrap.description,
			attachmentUrls: scrap.attachmentUrls,
			points: scrap.totalPoints,
			createdAt: scrap.createdAt
		};
	}

	public async getScrapById(scrapId: number): Promise<ScrapData | null> {
		const [scrap] = await db
			.select({
				id: scrapsTable.id,
				sessionId: scrapsTable.sessionId,
				title: scrapsTable.title,
				description: scrapsTable.description,
				attachmentUrls: scrapsTable.attachmentUrls,
				totalPoints: scrapsTable.totalPoints,
				createdAt: scrapsTable.createdAt,
				userId: scrapperSessionsTable.userId
			})
			.from(scrapsTable)
			.innerJoin(scrapperSessionsTable, eq(scrapsTable.sessionId, scrapperSessionsTable.id))
			.where(eq(scrapsTable.id, scrapId))
			.limit(1);

		if (!scrap) return null;

		return {
			id: scrap.id,
			userId: scrap.userId,
			sessionId: scrap.sessionId,
			title: scrap.title,
			description: scrap.description,
			attachmentUrls: scrap.attachmentUrls,
			points: scrap.totalPoints,
			createdAt: scrap.createdAt
		};
	}

	// Organizer methods
	public async getActiveSessionCount(): Promise<number> {
		const [{ count }] = await db
			.select({
				count: sql<number>`count(*)::int`
			})
			.from(scrapperSessionsTable)
			.where(eq(scrapperSessionsTable.status, 'active'));

		return count;
	}

	public async getScrapCountSince(since: Date): Promise<number> {
		const [{ count }] = await db
			.select({
				count: sql<number>`count(*)::int`
			})
			.from(scrapsTable)
			.where(sql`${scrapsTable.createdAt} >= ${since.toISOString()}`);

		return count;
	}

	public async getVoteCountSince(since: Date): Promise<number> {
		const [{ count }] = await db
			.select({
				count: sql<number>`count(*)::int`
			})
			.from(scrapVotesTable)
			.where(sql`${scrapVotesTable.createdAt} >= ${since.toISOString()}`);

		return count;
	}

	public async getRecentSessions(limit: number): Promise<SessionWithUser[]> {
		const sessions = await db
			.select({
				id: scrapperSessionsTable.id,
				userId: scrapperSessionsTable.userId,
				status: scrapperSessionsTable.status,
				startTime: scrapperSessionsTable.startTime,
				lastPausedAt: scrapperSessionsTable.lastPausedAt,
				endTime: scrapperSessionsTable.endTime,
				totalPausedTime: scrapperSessionsTable.totalPausedTime,
				userName: usersTable.name
			})
			.from(scrapperSessionsTable)
			.innerJoin(usersTable, eq(scrapperSessionsTable.userId, usersTable.id))
			.orderBy(desc(scrapperSessionsTable.createdAt))
			.limit(limit);

		return Promise.all(
			sessions.map(async (session) => {
				// Get totalPausedSeconds as a separate query
				const [{ totalPausedSeconds }] = await db
					.select({
						totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
					})
					.from(scrapperSessionsTable)
					.where(eq(scrapperSessionsTable.id, session.id));

				// Calculate duration in minutes
				const endTime = session.endTime || new Date();
				const durationMs = endTime.getTime() - session.startTime.getTime();
				const durationMinutes = Math.floor((durationMs / 1000 - totalPausedSeconds) / 60);

				return {
					id: session.id,
					userId: session.userId,
					status: session.status,
					startTime: session.startTime,
					lastPausedAt: session.lastPausedAt,
					totalPausedSeconds,
					completedAt: session.endTime,
					pointsPerHour: DEFAULT_POINTS_PER_HOUR,
					userName: session.userName,
					duration: durationMinutes
				};
			})
		);
	}

	public async getRecentScraps(limit: number): Promise<ScrapWithUser[]> {
		const scraps = await db
			.select({
				id: scrapsTable.id,
				sessionId: scrapsTable.sessionId,
				userId: scrapperSessionsTable.userId,
				title: scrapsTable.title,
				description: scrapsTable.description,
				attachmentUrls: scrapsTable.attachmentUrls,
				points: scrapsTable.totalPoints,
				createdAt: scrapsTable.createdAt,
				userName: usersTable.name
			})
			.from(scrapsTable)
			.innerJoin(scrapperSessionsTable, eq(scrapsTable.sessionId, scrapperSessionsTable.id))
			.innerJoin(usersTable, eq(scrapperSessionsTable.userId, usersTable.id))
			.orderBy(desc(scrapsTable.createdAt))
			.limit(limit);

		return scraps.map((scrap) => ({
			id: scrap.id,
			userId: scrap.userId,
			sessionId: scrap.sessionId,
			title: scrap.title,
			description: scrap.description,
			attachmentUrls: scrap.attachmentUrls,
			points: scrap.points,
			createdAt: scrap.createdAt,
			userName: scrap.userName
		}));
	}

	// Session listing methods
	public async getSessions(filters: SessionFilters): Promise<SessionWithUser[]> {
		const query = db
			.select({
				id: scrapperSessionsTable.id,
				userId: scrapperSessionsTable.userId,
				status: scrapperSessionsTable.status,
				startTime: scrapperSessionsTable.startTime,
				lastPausedAt: scrapperSessionsTable.lastPausedAt,
				endTime: scrapperSessionsTable.endTime,
				totalPausedTime: scrapperSessionsTable.totalPausedTime,
				userName: usersTable.name
			})
			.from(scrapperSessionsTable)
			.innerJoin(usersTable, eq(scrapperSessionsTable.userId, usersTable.id))
			.orderBy(desc(scrapperSessionsTable.createdAt));

		// Apply filters
		if (filters.status) {
			query.where(eq(scrapperSessionsTable.status, filters.status));
		}

		if (filters.search) {
			query.where(
				or(
					sql`LOWER(${usersTable.name}) LIKE ${`%${filters.search.toLowerCase()}%`}`,
					sql`${scrapperSessionsTable.id}::text LIKE ${`%${filters.search}%`}`
				)
			);
		}

		// Apply pagination
		if (filters.page && filters.pageSize) {
			const offset = (filters.page - 1) * filters.pageSize;
			query.limit(filters.pageSize).offset(offset);
		}

		const sessions = await query;

		return Promise.all(
			sessions.map(async (session) => {
				// Get totalPausedSeconds as a separate query
				const [{ totalPausedSeconds }] = await db
					.select({
						totalPausedSeconds: sql<number>`EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int`
					})
					.from(scrapperSessionsTable)
					.where(eq(scrapperSessionsTable.id, session.id));

				// Calculate duration in minutes
				const endTime = session.endTime || new Date();
				const durationMs = endTime.getTime() - session.startTime.getTime();
				const durationMinutes = Math.floor((durationMs / 1000 - totalPausedSeconds) / 60);

				return {
					id: session.id,
					userId: session.userId,
					status: session.status,
					startTime: session.startTime,
					lastPausedAt: session.lastPausedAt,
					totalPausedSeconds,
					completedAt: session.endTime,
					pointsPerHour: DEFAULT_POINTS_PER_HOUR,
					userName: session.userName,
					duration: durationMinutes
				};
			})
		);
	}

	public async getSessionCount(filters: Partial<SessionFilters>): Promise<number> {
		const query = db
			.select({
				count: sql<number>`count(*)::int`
			})
			.from(scrapperSessionsTable)
			.innerJoin(usersTable, eq(scrapperSessionsTable.userId, usersTable.id));

		if (filters.status) {
			query.where(eq(scrapperSessionsTable.status, filters.status));
		}

		if (filters.search) {
			query.where(
				or(
					sql`LOWER(${usersTable.name}) LIKE ${`%${filters.search.toLowerCase()}%`}`,
					sql`${scrapperSessionsTable.id}::text LIKE ${`%${filters.search}%`}`
				)
			);
		}

		const [{ count }] = await query;
		return count;
	}

	public async getTotalPointsForSession(sessionId: number): Promise<number> {
		const [result] = await db
			.select({
				totalPoints: sql<number>`COALESCE(SUM(${scrapsTable.totalPoints}), 0)::int`
			})
			.from(scrapsTable)
			.where(eq(scrapsTable.sessionId, sessionId));

		return result.totalPoints;
	}

	public async getSessionScraps(sessionId: number): Promise<ScrapWithUser[]> {
		const scraps = await db
			.select({
				id: scrapsTable.id,
				sessionId: scrapsTable.sessionId,
				userId: scrapperSessionsTable.userId,
				title: scrapsTable.title,
				description: scrapsTable.description,
				attachmentUrls: scrapsTable.attachmentUrls,
				points: scrapsTable.totalPoints,
				createdAt: scrapsTable.createdAt,
				userName: usersTable.name
			})
			.from(scrapsTable)
			.innerJoin(scrapperSessionsTable, eq(scrapsTable.sessionId, scrapperSessionsTable.id))
			.innerJoin(usersTable, eq(scrapperSessionsTable.userId, usersTable.id))
			.where(eq(scrapsTable.sessionId, sessionId))
			.orderBy(desc(scrapsTable.createdAt));

		return scraps.map((scrap) => ({
			id: scrap.id,
			userId: scrap.userId,
			sessionId: scrap.sessionId,
			title: scrap.title,
			description: scrap.description,
			attachmentUrls: scrap.attachmentUrls,
			points: scrap.points,
			createdAt: scrap.createdAt,
			userName: scrap.userName
		}));
	}

	public async getVotes(filters: VoteFilters): Promise<VoteWithUser[]> {
		const { userId, scrapId, startDate, endDate, page = 1, pageSize = 20 } = filters;
		const offset = (page - 1) * pageSize;

		// First get the filtered votes
		const voteQuery = db
			.select({
				id: scrapVotesTable.id,
				voterId: scrapVotesTable.voterId,
				scrapId: scrapVotesTable.scrapId,
				otherScrapId: scrapVotesTable.otherScrapId,
				points: scrapVotesTable.pointsAwarded,
				createdAt: scrapVotesTable.createdAt
			})
			.from(scrapVotesTable);

		// Apply filters
		const conditions = [];
		if (userId !== undefined) {
			conditions.push(eq(scrapVotesTable.voterId, userId));
		}
		if (scrapId !== undefined) {
			conditions.push(
				or(eq(scrapVotesTable.scrapId, scrapId), eq(scrapVotesTable.otherScrapId, scrapId))
			);
		}
		if (startDate) {
			conditions.push(sql`${scrapVotesTable.createdAt} >= ${startDate.toISOString()}`);
		}
		if (endDate) {
			conditions.push(sql`${scrapVotesTable.createdAt} <= ${endDate.toISOString()}`);
		}

		if (conditions.length > 0) {
			voteQuery.where(and(...conditions));
		}

		// Get the filtered votes with pagination
		const votes = await voteQuery
			.orderBy(desc(scrapVotesTable.createdAt))
			.limit(pageSize)
			.offset(offset);

		// For each vote, manually fetch the related data
		const result = await Promise.all(
			votes.map(async (vote) => {
				// Get user
				const [user] = await db
					.select({
						name: usersTable.name
					})
					.from(usersTable)
					.where(eq(usersTable.id, vote.voterId));

				// Get scrap
				const [scrap] = await db
					.select({
						title: scrapsTable.title
					})
					.from(scrapsTable)
					.where(eq(scrapsTable.id, vote.scrapId));

				// Get other scrap
				const [otherScrap] = await db
					.select({
						title: scrapsTable.title
					})
					.from(scrapsTable)
					.where(eq(scrapsTable.id, vote.otherScrapId));

				return {
					id: vote.id,
					userId: vote.voterId,
					scrapId: vote.scrapId,
					otherScrapId: vote.otherScrapId,
					points: vote.points,
					createdAt: vote.createdAt,
					userName: user?.name || 'Unknown User',
					scrapTitle: scrap?.title || 'Unknown Scrap',
					otherScrapTitle: otherScrap?.title || 'Unknown Scrap'
				};
			})
		);

		return result;
	}

	public async getVoteCount(filters: Partial<VoteFilters>): Promise<number> {
		const { userId, scrapId, startDate, endDate } = filters;

		// Build the query
		const query = db
			.select({
				count: sql<number>`count(*)::int`
			})
			.from(scrapVotesTable);

		// Apply filters
		const conditions = [];
		if (userId !== undefined) {
			conditions.push(eq(scrapVotesTable.voterId, userId));
		}
		if (scrapId !== undefined) {
			conditions.push(
				or(eq(scrapVotesTable.scrapId, scrapId), eq(scrapVotesTable.otherScrapId, scrapId))
			);
		}
		if (startDate) {
			conditions.push(sql`${scrapVotesTable.createdAt} >= ${startDate.toISOString()}`);
		}
		if (endDate) {
			conditions.push(sql`${scrapVotesTable.createdAt} <= ${endDate.toISOString()}`);
		}

		// Apply filters to query
		const finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;

		// Execute the query
		const [result] = await finalQuery;
		return result.count;
	}

	public async getVoteStats(): Promise<VoteStats> {
		// Get total votes
		const [totalVotesResult] = await db
			.select({
				totalVotes: sql<number>`count(*)::int`
			})
			.from(scrapVotesTable);

		// Get votes in the last hour
		const lastHour = new Date();
		lastHour.setHours(lastHour.getHours() - 1);
		const [lastHourVotesResult] = await db
			.select({
				lastHourVotes: sql<number>`count(*)::int`
			})
			.from(scrapVotesTable)
			.where(sql`${scrapVotesTable.createdAt} >= ${lastHour.toISOString()}`);

		// Get votes in the last 24 hours
		const last24Hours = new Date();
		last24Hours.setHours(last24Hours.getHours() - 24);
		const [last24HourVotesResult] = await db
			.select({
				last24HourVotes: sql<number>`count(*)::int`
			})
			.from(scrapVotesTable)
			.where(sql`${scrapVotesTable.createdAt} >= ${last24Hours.toISOString()}`);

		// Compute average votes per user
		const userVoteCounts = await db
			.select({
				voterId: scrapVotesTable.voterId,
				voteCount: sql<number>`count(*)::int`
			})
			.from(scrapVotesTable)
			.groupBy(scrapVotesTable.voterId);

		let averageVotesPerUser = 0;
		if (userVoteCounts.length > 0) {
			const totalUserVotes = userVoteCounts.reduce((sum, { voteCount }) => sum + voteCount, 0);
			averageVotesPerUser = totalUserVotes / userVoteCounts.length;
		}

		// Get top voters
		const topVoters = await db
			.select({
				userId: scrapVotesTable.voterId,
				voteCount: sql<number>`count(*)::int`
			})
			.from(scrapVotesTable)
			.groupBy(scrapVotesTable.voterId)
			.orderBy(sql`count(*) desc`)
			.limit(10);

		// Get user names for top voters
		const topVotersWithNames = await Promise.all(
			topVoters.map(async (voter) => {
				const [user] = await db
					.select({
						name: usersTable.name
					})
					.from(usersTable)
					.where(eq(usersTable.id, voter.userId));

				return {
					userId: voter.userId,
					userName: user?.name || 'Unknown User',
					voteCount: voter.voteCount
				};
			})
		);

		return {
			totalVotes: totalVotesResult.totalVotes,
			lastHourVotes: lastHourVotesResult.lastHourVotes,
			last24HourVotes: last24HourVotesResult.last24HourVotes,
			averageVotesPerUser,
			topVoters: topVotersWithNames
		};
	}

	public async getUserVotingActivity(limit = 100): Promise<UserVotingActivity[]> {
		// Get all users
		const users = await db
			.select({
				id: usersTable.id,
				name: usersTable.name
			})
			.from(usersTable)
			.limit(limit);

		// For each user, get their voting activity
		const result = await Promise.all(
			users.map(async (user) => {
				// Get total votes for this user
				const [votesCount] = await db
					.select({
						count: sql<number>`count(*)::int`
					})
					.from(scrapVotesTable)
					.where(eq(scrapVotesTable.voterId, user.id));

				// Get the last vote time for this user
				const [lastVote] = await db
					.select({
						createdAt: scrapVotesTable.createdAt
					})
					.from(scrapVotesTable)
					.where(eq(scrapVotesTable.voterId, user.id))
					.orderBy(desc(scrapVotesTable.createdAt))
					.limit(1);

				return {
					userId: user.id,
					userName: user.name,
					totalVotes: votesCount.count,
					lastVoteTime: lastVote?.createdAt || null
				};
			})
		);

		// Sort by total votes (descending)
		return result.sort((a, b) => b.totalVotes - a.totalVotes);
	}

	public async getUserVotesInLastHour(userId: number): Promise<number> {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

		const [result] = await db
			.select({
				count: sql<number>`count(*)::int`
			})
			.from(scrapVotesTable)
			.where(and(eq(scrapVotesTable.voterId, userId), gt(scrapVotesTable.createdAt, oneHourAgo)));

		return result.count;
	}

	public async getOldestVoteTimeInLastHour(userId: number): Promise<Date | null> {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

		const [oldestVote] = await db
			.select({
				createdAt: scrapVotesTable.createdAt
			})
			.from(scrapVotesTable)
			.where(and(eq(scrapVotesTable.voterId, userId), gt(scrapVotesTable.createdAt, oneHourAgo)))
			.orderBy(scrapVotesTable.createdAt)
			.limit(1);

		return oldestVote ? oldestVote.createdAt : null;
	}

	public async invalidateVote(voteId: number): Promise<void> {
		await db.transaction(async (tx) => {
			// Get the vote to invalidate
			const [vote] = await tx.select().from(scrapVotesTable).where(eq(scrapVotesTable.id, voteId));

			if (!vote) {
				throw new Error(`Vote with ID ${voteId} not found`);
			}

			// Delete the vote
			await tx.delete(scrapVotesTable).where(eq(scrapVotesTable.id, voteId));
		});
	}
}
