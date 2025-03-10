import { and, eq, or, sql, not, exists, desc, ne } from 'drizzle-orm';
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
	SessionFilters
} from './types';

const DEFAULT_POINTS_PER_HOUR = 100;

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
			const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
				drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
                    FROM ${scrapperSessionsTable} 
                    WHERE id = ${session.id}`
			);

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
			const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
				drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
                    FROM ${scrapperSessionsTable} 
                    WHERE id = ${session.id}`
			);

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
		const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
			drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
                FROM ${scrapperSessionsTable} 
                WHERE id = ${updatedSession.id}`
		);

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

		// We need to avoid using raw Date objects in SQL template literals
		if (session.lastPausedAt) {
			// First calculate the pause duration and format it as an interval string
			const pausedMs = currentTime.getTime() - new Date(session.lastPausedAt).getTime();
			const pausedSeconds = Math.floor(pausedMs / 1000);
			const pauseIntervalStr = `${pausedSeconds} seconds`;

			console.log('Adding pause interval:', {
				lastPausedAt: session.lastPausedAt,
				currentTime,
				pausedSeconds,
				pauseIntervalStr
			});

			// Then update the session with a safely formatted interval
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

			// Get totalPausedSeconds as a separate query
			const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
				drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
                    FROM ${scrapperSessionsTable} 
                    WHERE id = ${updatedSession.id}`
			);

			console.log('Updated session with pause interval:', {
				...updatedSession,
				totalPausedSeconds
			});
			return { ...updatedSession, totalPausedSeconds };
		} else {
			// If there's no lastPausedAt, just update the status
			const [updatedSession] = await db
				.update(scrapperSessionsTable)
				.set({
					status: 'active',
					lastPausedAt: null,
					updatedAt: currentTime
				})
				.where(eq(scrapperSessionsTable.id, sessionId))
				.returning();

			// Get totalPausedSeconds as a separate query
			const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
				drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
                    FROM ${scrapperSessionsTable} 
                    WHERE id = ${updatedSession.id}`
			);

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
			const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
				drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
                    FROM ${scrapperSessionsTable} 
                    WHERE id = ${updatedSession.id}`
			);

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
			const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
				drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
                    FROM ${scrapperSessionsTable} 
                    WHERE id = ${updatedSession.id}`
			);

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
		const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
			drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
                FROM ${scrapperSessionsTable} 
                WHERE id = ${updatedSession.id}`
		);

		return { ...updatedSession, totalPausedSeconds };
	}

	public async getSessionById(sessionId: number): Promise<DBSessionData | null> {
		const [session] = await db
			.select()
			.from(scrapperSessionsTable)
			.where(eq(scrapperSessionsTable.id, sessionId));

		if (session) {
			// Get totalPausedSeconds as a separate query
			const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
				drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
                    FROM ${scrapperSessionsTable} 
                    WHERE id = ${session.id}`
			);

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
		const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
			drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
                FROM ${scrapperSessionsTable} 
                WHERE id = ${updatedSession.id}`
		);

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
	}): Promise<VoteData> {
		// Only interact with scrapVotesTable here.
		const [vote] = await db.transaction(async (tx) => {
			const [vote] = await tx
				.insert(scrapVotesTable)
				.values({
					voterId: input.userId,
					scrapId: input.scrapId,
					otherScrapId: input.otherScrapId,
					pointsAwarded: 0 // We'll remove points from here.
				})
				.returning();
			return [vote];
		});

		return {
			id: vote.id,
			userId: vote.voterId,
			scrapId: vote.scrapId,
			otherScrapId: input.otherScrapId, // We'll add this to schema later
			points: 0, // No points calculated here
			createdAt: vote.createdAt
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
				const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
					drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
						FROM ${scrapperSessionsTable} 
						WHERE id = ${session.id}`
				);

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
				const [{ totalPausedSeconds }] = await db.execute<{ totalPausedSeconds: number }>(
					drizzleSql`SELECT EXTRACT(EPOCH FROM ${scrapperSessionsTable.totalPausedTime})::int as "totalPausedSeconds" 
						FROM ${scrapperSessionsTable} 
						WHERE id = ${session.id}`
				);

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
}
