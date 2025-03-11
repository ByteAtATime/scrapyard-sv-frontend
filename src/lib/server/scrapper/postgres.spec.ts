import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostgresScrapperRepo } from './postgres';
import {
	scrapperSessionsTable,
	scrapsTable,
	scrapVotesTable,
	usersTable,
	pointTransactionsTable
} from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import type { SessionFilters } from './types';

describe('PostgresScrapperRepo', () => {
	let repository: PostgresScrapperRepo;

	// Helper functions to create users and sessions
	const createUser = async (userId: number, name: string) => {
		await db.insert(usersTable).values({
			id: userId,
			name,
			email: `${name.toLowerCase().replace(/\s/g, '')}@example.com`,
			authProvider: 'clerk',
			authProviderId: `test-id-${userId}`
		});
		return userId;
	};

	const createSession = async (
		userId: number,
		status: typeof scrapperSessionsTable.$inferInsert.status = 'active'
	) => {
		const [session] = await db
			.insert(scrapperSessionsTable)
			.values({
				userId,
				status,
				totalPausedTime: '0 seconds'
			})
			.returning();

		return { ...session, totalPausedSeconds: 0 };
	};

	const createScrap = async (
		sessionId: number,
		overrides: Partial<typeof scrapsTable.$inferInsert> = {}
	) => {
		const [scrap] = await db
			.insert(scrapsTable)
			.values({
				sessionId,
				title: 'Test Scrap',
				description: 'Test Description',
				attachmentUrls: [],
				basePoints: 10,
				totalPoints: 10,
				...overrides
			})
			.returning();
		return scrap;
	};

	beforeEach(() => {
		repository = new PostgresScrapperRepo();
	});

	describe('getSession', () => {
		it('should return the active session for a user', async () => {
			// Given: a user exists with an active session
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId, 'active');

			// When: getSession is called
			const retrievedSession = await repository.getSession(userId);

			// Then: the correct session should be returned
			expect(retrievedSession).toMatchObject(session);
		});

		it('should return null if no active session exists', async () => {
			// Given: a user exists with no active sessions
			const userId = 2;
			await createUser(userId, 'Test User');

			// When: getSession is called
			const retrievedSession = await repository.getSession(userId);

			// Then: null should be returned
			expect(retrievedSession).toBeNull();
		});

		it('should return session with totalPausedSeconds', async () => {
			// Given: a user exists with an active session
			const userId = 3;
			await createUser(userId, 'Test User');
			const session = await createSession(userId, 'active');

			// Simulate pausing and resuming to accumulate paused time
			await repository.pauseSession(session.id);
			await repository.resumeSession(session.id);

			// When: getSession is called
			const retrievedSession = await repository.getSession(userId);

			// Then: totalPausedSeconds should be a number
			expect(retrievedSession).not.toBeNull();
			expect(typeof retrievedSession?.totalPausedSeconds).toBe('number');
		});
	});

	describe('getCurrentSession', () => {
		it('should return the current session for a user (active or paused)', async () => {
			// Given: a user exists with an active session
			const userId = 1;
			await createUser(userId, 'Test User');
			const activeSession = await createSession(userId, 'active');

			// When: getCurrentSession is called
			const retrievedActiveSession = await repository.getCurrentSession(userId);

			// Then: the active session should be returned
			expect(retrievedActiveSession).toMatchObject(activeSession);

			// And: a paused session exists
			await repository.pauseSession(activeSession.id);
			const pausedSession = await repository.getSessionById(activeSession.id);

			// When: getCurrentSession is called
			const retrievedPausedSession = await repository.getCurrentSession(userId);

			// Then: the paused session should be returned
			expect(retrievedPausedSession).toMatchObject(pausedSession!);
		});

		it('should return null if no current session (active/paused) exists', async () => {
			// Given: a user exists with no active or paused sessions
			const userId = 2;
			await createUser(userId, 'Test User');

			// When: getCurrentSession is called
			const retrievedSession = await repository.getCurrentSession(userId);

			// Then: null should be returned
			expect(retrievedSession).toBeNull();
		});
	});

	describe('createSession', () => {
		it('should create a new active session for a user', async () => {
			// Given: a user exists
			const userId = 1;
			await createUser(userId, 'Test User');

			// When: createSession is called
			const session = await repository.createSession(userId);

			// Then: a new session should be created with active status
			expect(session).toMatchObject({
				userId,
				status: 'active',
				totalPausedSeconds: 0
			});
		});
	});

	describe('pauseSession', () => {
		it('should pause an existing session', async () => {
			// Given: a user exists with an active session
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId, 'active');

			// When: pauseSession is called
			const pausedSession = await repository.pauseSession(session.id);

			// Then: the session should be updated to paused status
			expect(pausedSession).toMatchObject({
				id: session.id,
				status: 'paused',
				lastPausedAt: expect.any(Date)
			});
		});

		it('should throw an error for non-existent session', async () => {
			// Given: no session exists
			const nonExistentId = 999;

			// When: pauseSession is called with a non-existent ID
			const attemptPause = () => repository.pauseSession(nonExistentId);

			// Then: an error should be thrown
			await expect(attemptPause()).rejects.toThrow(/session with id.*not found/i);
		});
	});

	describe('resumeSession', () => {
		it('should resume a paused session', async () => {
			vi.useFakeTimers();

			// Given: a user exists with a paused session
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId, 'active');
			await repository.pauseSession(session.id);

			// Introduce a delay to ensure measurable pause time
			vi.advanceTimersByTime(1000);

			// When: resumeSession is called
			const resumedSession = await repository.resumeSession(session.id);

			// Then: the session status should be updated, and pause time calculated
			expect(resumedSession).toMatchObject({
				id: session.id,
				status: 'active',
				lastPausedAt: null // Should be cleared
			});
			expect(resumedSession.totalPausedSeconds).toBeGreaterThan(0);
		});

		it('should resume an active session that was not paused', async () => {
			// Given: a user exists with an active session
			const userId = 2;
			await createUser(userId, 'Test User 2');
			const session = await createSession(userId, 'active');

			// When: resumeSession is called without previously pausing
			const resumedSession = await repository.resumeSession(session.id);

			// Then: the session should remain active, and no pause time is added
			expect(resumedSession).toMatchObject({
				id: session.id,
				status: 'active',
				lastPausedAt: null
			});
			expect(resumedSession.totalPausedSeconds).toBe(0);
		});

		it('should throw an error for non-existent session', async () => {
			// Given: no session exists
			const nonExistentId = 999;

			// When: resumeSession is called
			const attemptResume = () => repository.resumeSession(nonExistentId);

			// Then: an error should be thrown
			await expect(attemptResume()).rejects.toThrow(/session with id.*not found/i);
		});
	});

	describe('completeSession', () => {
		it('should complete an active session and award points', async () => {
			vi.useFakeTimers(); //Use fake timers
			// Given: a user exists with an active session
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId, 'active');

			// Introduce a delay to simulate an hour passing
			vi.advanceTimersByTime(3601000);

			// When: completeSession is called
			const completedSession = await repository.completeSession(session.id);

			// Then: the session status should be updated
			expect(completedSession).toMatchObject({
				id: session.id,
				status: 'completed',
				endTime: expect.any(Date)
			});

			// And: points should be awarded
			const transactions = await db
				.select()
				.from(pointTransactionsTable)
				.where(eq(pointTransactionsTable.userId, userId));
			expect(transactions.length).toBeGreaterThan(0);
			expect(transactions[0].amount).toBeGreaterThan(0);
			expect(transactions[0].status).toBe('approved');
			vi.useRealTimers(); //Restore timers
		});

		it('should complete a paused session, add remaining pause time, and award points', async () => {
			vi.useFakeTimers();
			// Given: a user exists with a paused session
			const userId = 2;
			await createUser(userId, 'Test User');
			const session = await createSession(userId, 'active');

			// Delay to accumulate *enough active time* (MORE than an hour).
			vi.advanceTimersByTime(3601000); // > 1 hour

			await repository.pauseSession(session.id); // Pause the session

			// Delay to accumulate some paused time (this doesn't affect point calculation).
			vi.advanceTimersByTime(2000);

			// *NO* further delay here.  completeSession handles the final pause time.

			// When: completeSession is called
			const completedSession = await repository.completeSession(session.id);

			// Then: session should be completed, and pause time should be added
			expect(completedSession).toMatchObject({
				id: session.id,
				status: 'completed',
				endTime: expect.any(Date)
			});
			expect(completedSession.totalPausedSeconds).toBeGreaterThan(0);

			// And: points should be awarded
			const transactions = await db
				.select()
				.from(pointTransactionsTable)
				.where(eq(pointTransactionsTable.userId, userId));
			expect(transactions.length).toBeGreaterThan(0);
			expect(transactions[0].amount).toBeGreaterThan(0);
			expect(transactions[0].status).toBe('approved');
			vi.useRealTimers();
		});

		it('should throw an error for non-existent session', async () => {
			// Given: no session exists
			const nonExistentId = 999;

			// When: completeSession is called
			const attemptComplete = () => repository.completeSession(nonExistentId);

			// Then: an error should be thrown
			await expect(attemptComplete()).rejects.toThrow(/session with id.*not found/i);
		});

		it('should not award points if session duration (minus paused time) is 0', async () => {
			// Given: a user exists with an active session
			const userId = 3;
			await createUser(userId, 'Test User');
			const session = await createSession(userId, 'active');

			// When: completeSession is called immediately (no duration)
			await repository.completeSession(session.id);

			// Then: No points should be awarded.
			const transactions = await db
				.select()
				.from(pointTransactionsTable)
				.where(eq(pointTransactionsTable.userId, userId));

			expect(transactions).toEqual([]);
		});
	});

	describe('cancelSession', () => {
		it('should cancel an existing session', async () => {
			// Given: a user exists with an active session
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId, 'active');

			// When: cancelSession is called
			const cancelledSession = await repository.cancelSession(session.id);

			// Then: the session should be updated to cancelled status
			expect(cancelledSession).toMatchObject({
				id: session.id,
				status: 'cancelled',
				endTime: expect.any(Date)
			});
		});
	});

	describe('getSessionById', () => {
		it('should return a session by its ID', async () => {
			// Given: a user exists with an active session
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId, 'active');

			// When: getSessionById is called
			const retrievedSession = await repository.getSessionById(session.id);

			// Then: the correct session should be returned
			expect(retrievedSession).toMatchObject(session);
		});

		it('should return null for non-existent session', async () => {
			// Given: no session exists
			const nonExistentId = 999;

			// When: getSessionById is called with a non-existent ID
			const retrievedSession = await repository.getSessionById(nonExistentId);

			// Then: null should be returned
			expect(retrievedSession).toBeNull();
		});

		it('should return session with totalPausedSeconds', async () => {
			// Given: a user exists with an active session
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId, 'active');

			// Simulate pausing to add some paused time
			await repository.pauseSession(session.id);
			await repository.resumeSession(session.id);

			// When: getSessionById is called
			const retrievedSession = await repository.getSessionById(session.id);

			// Then: the returned object includes totalPausedSeconds
			expect(retrievedSession).not.toBeNull();
			expect(typeof retrievedSession?.totalPausedSeconds).toBe('number');
		});
	});

	describe('updateSession', () => {
		it('should update session data', async () => {
			// Given: a user exists with a session
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId);

			// When: updateSession is called
			const updatedData = { status: 'paused' as const, lastPausedAt: new Date() };
			const updatedSession = await repository.updateSession(session.id, updatedData);

			// Then: the session should be updated with the new data
			expect(updatedSession).toMatchObject({
				id: session.id,
				...updatedData
			});
		});
	});

	describe('createScrap', () => {
		it('should create a new scrap', async () => {
			// Given: a user and a session exist
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId);

			// When: createScrap is called
			const scrapInput = {
				userId,
				sessionId: session.id,
				title: 'Test Scrap',
				description: 'Test Description',
				attachmentUrls: [],
				points: 10
			};
			const scrap = await repository.createScrap(scrapInput);

			// Then: the scrap should be created with the given data
			expect(scrap).toMatchObject({
				...scrapInput,
				id: expect.any(Number)
			});
		});
	});

	describe('getRandomScrapsForVoting', () => {
		it('should return two distinct scraps not created by the user', async () => {
			// Given: multiple users and sessions with scraps exist
			const user1 = await createUser(1, 'User One');
			const user2 = await createUser(2, 'User Two');
			const user3 = await createUser(3, 'Voter User'); // This user will vote

			const session1 = await createSession(user1, 'completed');
			const session2 = await createSession(user2, 'completed');

			await createScrap(session1.id);
			await createScrap(session2.id);

			// When: getRandomScrapsForVoting is called
			const [scrap1, scrap2] = await repository.getRandomScrapsForVoting(user3, 2);

			// Then: two different scraps should be returned
			expect(scrap1).toBeDefined();
			expect(scrap2).toBeDefined();
			expect(scrap1.id).not.toBe(scrap2.id);

			// And: they must not belong to voter user
			expect(scrap1.userId).not.toBe(user3);
			expect(scrap2.userId).not.toBe(user3);
		});

		it('should throw an error if not enough scraps are available', async () => {
			// Given: only one user and one completed session exist
			const userId = 1;
			await createUser(userId, 'Only User');
			const session = await createSession(userId, 'completed');
			await createScrap(session.id);

			// And: a second user exists with no scraps
			const voterId = 2;
			await createUser(voterId, 'Voter');

			// When: getRandomScrapsForVoting is called
			const attemptGetScraps = () => repository.getRandomScrapsForVoting(voterId, 2);

			// Then: an error should be thrown
			await expect(attemptGetScraps()).rejects.toThrow(/not enough scraps/i);
		});
	});

	describe('createVote', () => {
		it('should create a new vote', async () => {
			// Given: users and scraps exist
			const user1 = await createUser(1, 'Scrap Creator 1');
			const user2 = await createUser(2, 'Scrap Creator 2');
			const voterId = 3;
			await createUser(voterId, 'Voter User');
			const session1 = await createSession(user1, 'completed');
			const session2 = await createSession(user2, 'completed');
			const scrap1 = await createScrap(session1.id);
			const scrap2 = await createScrap(session2.id);

			// When: createVote is called
			const vote = await repository.createVote({
				userId: voterId,
				scrapId: scrap1.id,
				otherScrapId: scrap2.id
			});

			// Then: a new vote should be created
			expect(vote).toMatchObject({
				userId: voterId,
				scrapId: scrap1.id,
				otherScrapId: scrap2.id,
				points: 0 // Initial points
			});
		});
	});

	describe('updateScrapPoints', () => {
		it('should update the total points of a scrap', async () => {
			// Given: a scrap exists
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId);
			const scrap = await createScrap(session.id);

			// When: updateScrapPoints is called
			const pointsToAdd = 5;
			const updatedScrap = await repository.updateScrapPoints(scrap.id, pointsToAdd);

			// Then: the scrap's total points should be updated
			expect(updatedScrap.points).toBe(scrap.totalPoints + pointsToAdd);
		});
	});

	describe('getScrapById', () => {
		it('should return a scrap by its ID', async () => {
			// Given: a scrap exists
			const userId = 1;
			await createUser(userId, 'Test User');
			const session = await createSession(userId);
			const scrap = await createScrap(session.id);

			// When: getScrapById is called
			const retrievedScrap = await repository.getScrapById(scrap.id);

			// Then: the correct scrap should be returned
			expect(retrievedScrap).toMatchObject({
				id: scrap.id,
				userId,
				sessionId: session.id,
				title: scrap.title,
				description: scrap.description,
				attachmentUrls: scrap.attachmentUrls,
				points: scrap.totalPoints
			});
		});

		it('should return null for non-existent scrap', async () => {
			// Given: no scrap exists with the given ID
			const nonExistentId = 999;

			// When: getScrapById is called
			const retrievedScrap = await repository.getScrapById(nonExistentId);

			// Then: null should be returned
			expect(retrievedScrap).toBeNull();
		});
	});

	describe('Organizer methods', () => {
		describe('getActiveSessionCount', () => {
			it('should return the number of active sessions', async () => {
				// Given: multiple users with various session statuses
				const user1 = await createUser(1, 'User One');
				const user2 = await createUser(2, 'User Two');
				await createSession(user1, 'active');
				await createSession(user2, 'paused');

				// When: getActiveSessionCount is called
				const count = await repository.getActiveSessionCount();

				// Then: only active sessions should be counted
				expect(count).toBe(1);
			});
		});

		describe('getScrapCountSince', () => {
			it('should return the number of scraps created since a given date', async () => {
				// Given: a user and sessions with scraps exist
				const userId = 1;
				await createUser(userId, 'Test User');
				const session1 = await createSession(userId);
				const session2 = await createSession(userId);

				// Create some scraps, one before the 'since' date and one after
				const since = new Date();
				await createScrap(session1.id, { createdAt: new Date(since.getTime() - 10000) }); // Before
				await createScrap(session2.id, { createdAt: new Date(since.getTime() + 10000) }); // After

				// When: getScrapCountSince is called
				const count = await repository.getScrapCountSince(since);

				// Then: only scraps created after the 'since' date should be counted
				expect(count).toBe(1);
			});
		});

		describe('getVoteCountSince', () => {
			it('should return the number of votes cast since a given date', async () => {
				// Given: multiple users and votes exist
				const user1 = await createUser(1, 'Scrap Creator 1');
				const user2 = await createUser(2, 'Scrap Creator 2');
				const voterId = 3;
				await createUser(voterId, 'Voter User');
				const session1 = await createSession(user1, 'completed');
				const session2 = await createSession(user2, 'completed');
				const scrap1 = await createScrap(session1.id);
				const scrap2 = await createScrap(session2.id);

				// Create votes before and after the 'since' date
				const since = new Date();
				await repository.createVote({
					userId: voterId,
					scrapId: scrap1.id,
					otherScrapId: scrap2.id
				}); // Create a vote before
				await db
					.update(scrapVotesTable)
					.set({ createdAt: new Date(since.getTime() - 10000) })
					.where(eq(scrapVotesTable.voterId, voterId));
				await repository.createVote({
					userId: voterId,
					scrapId: scrap2.id,
					otherScrapId: scrap1.id
				}); // Create after

				// When: getVoteCountSince is called
				const count = await repository.getVoteCountSince(since);

				// Then: only votes created after the 'since' date should be counted
				expect(count).toBe(1);
			});
		});

		describe('getRecentSessions', () => {
			it('should return recent sessions with user names and duration', async () => {
				// Given: multiple users with sessions exist
				const user1 = await createUser(1, 'User One');
				const user2 = await createUser(2, 'User Two');

				// Create some recent sessions (completed and active, to test both)

				//Crucially set the start time *AFTER* the session
				//is created, so they overwrite the default value.

				const session1 = await createSession(user1, 'completed');
				const startTime1 = new Date(Date.now() - 3600000); // 1 hour ago
				await db
					.update(scrapperSessionsTable)
					.set({ startTime: startTime1, endTime: new Date() })
					.where(eq(scrapperSessionsTable.id, session1.id));
				const session2 = await createSession(user2, 'active');
				const startTime2 = new Date(Date.now() - 1800000); //30 minutes ago.
				await db
					.update(scrapperSessionsTable)
					.set({ startTime: startTime2 })
					.where(eq(scrapperSessionsTable.id, session2.id));

				// When: getRecentSessions is called with limit
				const limit = 2;
				const sessions = await repository.getRecentSessions(limit);

				// Then: recent sessions should be returned, sorted by createdAt
				expect(sessions.length).toBeLessThanOrEqual(limit);
				expect(sessions[0].userName).toBeDefined();
				expect(sessions[0].duration).toBeDefined(); // Duration in minutes
				expect(sessions[0].totalPausedSeconds).toBeDefined();

				const [latestSession, secondLatestSession] = sessions;
				//Now compare startTimes:

				expect(latestSession.startTime.getTime()).toBeGreaterThan(
					secondLatestSession.startTime.getTime()
				);
			});
		});

		describe('getRecentScraps', () => {
			it('should return recent scraps with user names', async () => {
				// Given: multiple users with scraps exist
				const user1 = await createUser(1, 'User One');
				const user2 = await createUser(2, 'User Two');

				// Create sessions for the users
				const session1 = await createSession(user1);
				const session2 = await createSession(user2);

				// Create some recent scraps
				await createScrap(session1.id);
				await createScrap(session2.id);

				// When: getRecentScraps is called
				const limit = 2;
				const scraps = await repository.getRecentScraps(limit);

				// Then: recent scraps should be returned, with usernames, sorted by createdAt
				expect(scraps.length).toBeLessThanOrEqual(limit);
				expect(scraps[0].userName).toBeDefined();
				expect(scraps[0].createdAt).toBeDefined();
			});
		});
	});

	describe('Session listing methods', () => {
		describe('getSessions', () => {
			it('should return sessions filtered by status', async () => {
				// Given: multiple users with various session statuses
				const user1 = await createUser(1, 'User One');
				const user2 = await createUser(2, 'User Two');
				await createSession(user1, 'completed');
				await createSession(user2, 'active');

				// When: getSessions is called with a status filter
				const filters: SessionFilters = { status: 'completed' };
				const sessions = await repository.getSessions(filters);

				// Then: only sessions with the specified status should be returned
				expect(sessions.every((s) => s.status === 'completed')).toBe(true);
			});

			it('should return sessions filtered by search term (user name)', async () => {
				// Given: users with different names exist, with sessions
				const user1 = await createUser(1, 'John Doe');
				const user2 = await createUser(2, 'Jane Smith');
				await createSession(user1);
				await createSession(user2);

				// When: getSessions is called with a search filter
				const filters: SessionFilters = { search: 'John' };
				const sessions = await repository.getSessions(filters);

				// Then: only sessions for users matching the search term should return
				expect(sessions.every((s) => s.userName.includes('John'))).toBe(true);
			});

			it('should return sessions filtered by search term (session ID)', async () => {
				// Given: users with sessions exist
				const user1 = await createUser(1, 'John Doe');
				const user2 = await createUser(2, 'Jane Smith');
				const session1 = await createSession(user1);
				await createSession(user2);

				// When: getSessions is called with search filter on session ID
				const filters: SessionFilters = { search: session1.id.toString() };
				const sessions = await repository.getSessions(filters);

				// Then: only the matching session should be returned
				expect(sessions).toHaveLength(1);
				expect(sessions[0].id).toBe(session1.id);
			});

			it('should return sessions with pagination', async () => {
				// Given: multiple users with sessions exist
				const user1 = await createUser(1, 'User One');
				const user2 = await createUser(2, 'User Two');
				const user3 = await createUser(3, 'User Three');
				//create multiple sessions
				await createSession(user1);
				await createSession(user2);
				await createSession(user3);

				// When: getSessions is called with pagination filters
				const filters: SessionFilters = { page: 2, pageSize: 1 };
				const sessions = await repository.getSessions(filters);

				// Then: only one session of the second page should be returned
				expect(sessions.length).toBe(1);
			});

			it('should return sessions with user names and duration', async () => {
				// Given: a user with a completed session exists
				const userId = 1;
				const userName = 'Test User';
				await createUser(userId, userName);

				//create a session
				const session1 = await createSession(userId, 'completed');
				await db
					.update(scrapperSessionsTable)
					.set({ startTime: new Date(Date.now() - 3600000), endTime: new Date() })
					.where(eq(scrapperSessionsTable.id, session1.id));

				// When: getSessions is called
				const filters: SessionFilters = {}; // No filters
				const sessions = await repository.getSessions(filters);

				// Then: sessions should include usernames and durations
				expect(sessions.length).toBeGreaterThan(0);
				expect(sessions[0].userName).toBe(userName);
				expect(sessions[0].duration).toBeDefined(); // Duration is in minutes
				expect(sessions[0].totalPausedSeconds).toBeDefined();
			});
		});

		describe('getSessionCount', () => {
			it('should return the total number of sessions matching filters', async () => {
				// Given: multiple users and sessions exist
				const user1 = await createUser(1, 'John Doe');
				const user2 = await createUser(2, 'Jane Smith');

				await createSession(user1, 'completed');
				await createSession(user2, 'active');
				await createSession(user2, 'completed');

				// When: getSessionCount is called with status filter
				const filters: Partial<SessionFilters> = { status: 'completed' };
				const count = await repository.getSessionCount(filters);

				// Then: the correct count should be returned
				expect(count).toBe(2);
			});

			it('should return count filtered by search (user name)', async () => {
				// Given: multiple users and sessions exist
				const user1 = await createUser(1, 'John Doe');
				const user2 = await createUser(2, 'Jane Smith');

				await createSession(user1, 'completed');
				await createSession(user2, 'active');
				await createSession(user2, 'completed');

				// When: getSessionCount is called with search filter
				const filters: Partial<SessionFilters> = { search: 'Jane' };
				const count = await repository.getSessionCount(filters);

				// Then: only sessions matching the search term should be counted
				expect(count).toBe(2);
			});

			it('should return count filtered by search (session ID)', async () => {
				// Given: multiple users and sessions
				const user1 = await createUser(1, 'John Doe');
				const user2 = await createUser(2, 'Jane Smith');
				const session1 = await createSession(user1);
				await createSession(user2, 'completed');

				// When: getSessionCount with session ID filter
				const filters: Partial<SessionFilters> = { search: session1.id.toString() };
				const count = await repository.getSessionCount(filters);

				// Then: only the matching session should be counted
				expect(count).toBe(1);
			});
		});

		describe('getTotalPointsForSession', () => {
			it('should return total points for a given session', async () => {
				// Given: user with a session and scraps exist
				const userId = 1;
				await createUser(userId, 'Test User');
				const session = await createSession(userId);

				// Create scraps within the session
				await createScrap(session.id, { totalPoints: 10 });
				await createScrap(session.id, { totalPoints: 20 });

				// When: getTotalPointsForSession
				const totalPoints = await repository.getTotalPointsForSession(session.id);

				// Then: the sum of all scrap points should be returned
				expect(totalPoints).toBe(30); // 10 + 20
			});
		});

		describe('getSessionScraps', () => {
			it('should return all scraps for a given session', async () => {
				// Given: a user with a session, and *one* scrap in the session
				const userId = 1;
				await createUser(userId, 'Test User');
				const session = await createSession(userId);

				// Create *one* scrap with the session.
				const scrap1 = await createScrap(session.id);

				// When: getSessionScraps
				const scraps = await repository.getSessionScraps(session.id);

				// Then: all scraps for that session should be returned (which is just one).
				expect(scraps).toHaveLength(1);
				expect(scraps[0]).toMatchObject({
					id: scrap1.id,
					sessionId: session.id,
					title: scrap1.title,
					description: scrap1.description,
					attachmentUrls: scrap1.attachmentUrls,
					points: scrap1.totalPoints,
					userId: userId //Important. Make sure the userId comes back
				});
				expect(scraps.every((s) => s.sessionId === session.id)).toBe(true);
			});

			it('should return an empty array if no scraps are associated with the session', async () => {
				// Given a user and a session, but NO scraps.
				const userId = 2;
				await createUser(userId, 'Another User');
				const session = await createSession(userId);

				// When getSessionScraps is called.
				const scraps = await repository.getSessionScraps(session.id);

				// Then the result should be an empty array.
				expect(scraps).toEqual([]);
			});
		});
	});
});
