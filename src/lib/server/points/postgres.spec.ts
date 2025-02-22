import { describe, it, expect, beforeEach } from 'vitest';
import { PostgresPointsRepo } from './postgres';
import { pointTransactionsTable, usersTable } from '../db/schema';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';

describe('PostgresPointsRepo', () => {
	let repository: PostgresPointsRepo;

	// Helper function to create a user
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

	// Helper function to create a transaction
	const createTestTransaction = (
		userId: number,
		{
			amount = 100,
			status = 'pending',
			reason = 'Test Transaction',
			authorId = userId,
			createdAt = new Date()
		}: Partial<typeof pointTransactionsTable.$inferInsert> = {}
	) => {
		return {
			userId,
			amount,
			status,
			reason,
			authorId,
			createdAt
		} satisfies typeof pointTransactionsTable.$inferInsert;
	};

	beforeEach(() => {
		repository = new PostgresPointsRepo();
	});

	describe('getTotalPoints', () => {
		it('should return the sum of valid transactions for a user with multiple approved transactions', async () => {
			// Given: a user exists with multiple approved transactions
			const userId = 1;
			await createUser(userId, 'Test User');
			const transactions = [
				{ userId, amount: 100, status: 'approved', reason: 'Test Approved', authorId: userId },
				{ userId, amount: 200, status: 'approved', reason: 'Test Approved', authorId: userId }
			] satisfies (typeof pointTransactionsTable.$inferInsert)[];
			await db.insert(pointTransactionsTable).values(transactions);

			// When: getTotalPoints is called for the user
			const total = await repository.getTotalPoints(userId);

			// Then: the returned total should be the sum of the approved transactions
			expect(total).toBe(300);
		});

		it('should return 0 for a user with no transactions', async () => {
			// Given: a user exists with no transactions
			const userId = 2;
			await createUser(userId, 'No Transaction User');

			// When: getTotalPoints is called for this user
			const total = await repository.getTotalPoints(userId);

			// Then: the returned total should be 0
			expect(total).toBe(0);
		});

		it('should only count approved transactions and negative pending transactions', async () => {
			// Given: a user exists with a mix of transaction statuses
			const userId = 3;
			await createUser(userId, 'Mixed Status User');
			const transactions = [
				{ userId, amount: 100, status: 'approved', reason: 'Valid Approved', authorId: userId },
				{
					userId,
					amount: 50,
					status: 'pending',
					reason: 'Positive Pending - Should Not Count',
					authorId: userId
				},
				{
					userId,
					amount: -30,
					status: 'pending',
					reason: 'Negative Pending - Should Count',
					authorId: userId
				},
				{ userId, amount: 200, status: 'rejected', reason: 'Invalid Rejected', authorId: userId },
				{ userId, amount: 30, status: 'deleted', reason: 'Invalid Deleted', authorId: userId }
			] satisfies (typeof pointTransactionsTable.$inferInsert)[];
			await db.insert(pointTransactionsTable).values(transactions);

			// When: getTotalPoints is called for the user
			const total = await repository.getTotalPoints(userId);

			// Then: the returned total should sum approved and negative pending transactions (100 - 30 = 70)
			expect(total).toBe(70);
		});

		it('should return the cached value on subsequent calls despite new database changes', async () => {
			// Given: a user exists with an initial approved transaction
			const userId = 4;
			await createUser(userId, 'Cache Test User');
			await db.insert(pointTransactionsTable).values({
				userId,
				amount: 80,
				status: 'approved',
				reason: 'Initial Transaction',
				authorId: userId
			});

			// When: getTotalPoints is called for the first time to populate the cache
			const firstTotal = await repository.getTotalPoints(userId);

			// And: a new approved transaction is inserted after caching
			await db.insert(pointTransactionsTable).values({
				userId,
				amount: 100,
				status: 'approved',
				reason: 'New Transaction',
				authorId: userId
			});

			// When: getTotalPoints is called again
			const secondTotal = await repository.getTotalPoints(userId);

			// Then: both calls should return the cached value (80), ignoring the new transaction
			expect(firstTotal).toBe(80);
			expect(secondTotal).toBe(80);
		});
	});

	describe('getTransactions', () => {
		it('should return an empty array when there are no transactions', async () => {
			// Given: the database has no transactions
			// (Note: the database is cleared between tests)

			// When: getTransactions is called
			const transactions = await repository.getTransactions();

			// Then: an empty array should be returned
			expect(transactions).toEqual([]);
		});

		it('should return all transactions sorted by createdAt', async () => {
			// Given: a user exists and multiple transactions are inserted with specific createdAt timestamps
			const userId = 5;
			await createUser(userId, 'Transactions User');

			const txn1 = {
				userId,
				amount: 50,
				status: 'approved' as const,
				reason: 'First Transaction',
				authorId: userId,
				createdAt: new Date('2023-01-01T00:00:00Z')
			};
			const txn2 = {
				userId,
				amount: 100,
				status: 'pending' as const,
				reason: 'Second Transaction',
				authorId: userId,
				createdAt: new Date('2023-01-02T00:00:00Z')
			};
			const txn3 = {
				userId,
				amount: 200,
				status: 'approved' as const,
				reason: 'Third Transaction',
				authorId: userId,
				createdAt: new Date('2023-01-03T00:00:00Z')
			};

			// Insert transactions in non-sorted order to test ordering
			await db
				.insert(pointTransactionsTable)
				.values([txn3, txn1, txn2] satisfies (typeof pointTransactionsTable.$inferInsert)[]);

			// When: getTransactions is called
			const transactions = await repository.getTransactions();

			// Then: the returned transactions should be sorted in ascending order by createdAt
			expect(transactions.length).toBe(3);
			expect(new Date(transactions[0].createdAt) <= new Date(transactions[1].createdAt)).toBe(true);
			expect(new Date(transactions[1].createdAt) <= new Date(transactions[2].createdAt)).toBe(true);
		});
	});

	describe('getTransactionsByUser', () => {
		it('should return an empty array when user has no transactions', async () => {
			// Given: a user exists with no transactions
			const userId = 1;
			await createUser(userId, 'No Transactions User');

			// When: getTransactionsByUser is called
			const transactions = await repository.getTransactionsByUser(userId);

			// Then: an empty array should be returned
			expect(transactions).toEqual([]);
		});

		it('should return only transactions for the specified user sorted by createdAt', async () => {
			// Given: two users exist with their own transactions
			const user1Id = 1;
			const user2Id = 2;
			await createUser(user1Id, 'First User');
			await createUser(user2Id, 'Second User');

			// And: transactions exist for both users
			const user1Transactions = [
				{
					userId: user1Id,
					amount: 100,
					status: 'approved' as const,
					reason: 'User 1 First',
					authorId: user1Id,
					createdAt: new Date('2023-01-01T00:00:00Z')
				},
				{
					userId: user1Id,
					amount: 200,
					status: 'pending' as const,
					reason: 'User 1 Second',
					authorId: user1Id,
					createdAt: new Date('2023-01-02T00:00:00Z')
				}
			] satisfies (typeof pointTransactionsTable.$inferInsert)[];

			const user2Transactions = [
				{
					userId: user2Id,
					amount: 300,
					status: 'approved' as const,
					reason: 'User 2 Transaction',
					authorId: user2Id,
					createdAt: new Date('2023-01-01T12:00:00Z')
				}
			] satisfies (typeof pointTransactionsTable.$inferInsert)[];

			await db.insert(pointTransactionsTable).values([...user1Transactions, ...user2Transactions]);

			// When: getTransactionsByUser is called for user1
			const transactions = await repository.getTransactionsByUser(user1Id);

			// Then: only user1's transactions should be returned in chronological order
			expect(transactions).toHaveLength(2);
			expect(transactions.every((t) => t.userId === user1Id)).toBe(true);
			expect(new Date(transactions[0].createdAt) <= new Date(transactions[1].createdAt)).toBe(true);
		});
	});

	describe('createTransaction', () => {
		it('should create a new transaction with the specified data', async () => {
			// Given: a user exists
			const userId = 1;
			const authorId = 2;
			await createUser(userId, 'Transaction User');
			await createUser(authorId, 'Author User');

			const transactionData = {
				userId,
				amount: 100,
				reason: 'Test Transaction',
				authorId
			} satisfies Parameters<typeof repository.createTransaction>[0];

			// When: createTransaction is called
			const transaction = await repository.createTransaction(transactionData);

			// Then: the transaction should be created with the correct data
			expect(transaction).toMatchObject({
				userId,
				amount: 100,
				reason: 'Test Transaction',
				authorId,
				status: 'pending'
			});

			// And: the transaction should be retrievable from the database
			const dbTransaction = await repository.getTransactionById(transaction.id);
			expect(dbTransaction).toMatchObject(transaction);
		});

		it('should invalidate relevant caches when creating a transaction', async () => {
			// Given: a user exists with an initial transaction
			const userId = 1;
			await createUser(userId, 'Cache Test User');
			await db.insert(pointTransactionsTable).values({
				userId,
				amount: 100,
				status: 'approved' as const,
				reason: 'Initial Transaction',
				authorId: userId
			});

			// And: the initial points are cached
			const initialTotal = await repository.getTotalPoints(userId);
			expect(initialTotal).toBe(100);

			// When: a new transaction is created (pending positive transaction should not count)
			await repository.createTransaction({
				userId,
				amount: 50,
				reason: 'New Transaction',
				authorId: userId
			});

			// Then: getTotalPoints should return the same value since pending positive transactions don't count
			const newTotal = await repository.getTotalPoints(userId);
			expect(newTotal).toBe(100);
		});

		it('should enforce foreign key constraints', async () => {
			// Given: no users exist in the database
			const nonExistentUserId = 999;

			// When: attempting to create a transaction with non-existent user/author
			const attemptCreate = () =>
				repository.createTransaction({
					userId: nonExistentUserId,
					amount: 100,
					reason: 'Should Fail',
					authorId: nonExistentUserId
				});

			// Then: the creation should fail with a foreign key constraint error
			await expect(attemptCreate()).rejects.toThrow(/foreign key constraint/i);
		});
	});

	describe('reviewTransaction', () => {
		it('should update transaction status to approved', async () => {
			// Given: a user exists with a pending transaction
			const userId = 1;
			const reviewerId = 2;
			await createUser(userId, 'Transaction User');
			await createUser(reviewerId, 'Reviewer User');

			const transaction = createTestTransaction(userId);
			const [createdTxn] = await db.insert(pointTransactionsTable).values(transaction).returning();

			// When: the transaction is approved
			const reviewedTransaction = await repository.reviewTransaction(createdTxn.id, {
				reviewerId,
				status: 'approved'
			});

			// Then: the transaction should be updated with approved status
			expect(reviewedTransaction).toMatchObject({
				...transaction,
				status: 'approved',
				reviewerId,
				reviewedAt: expect.any(Date)
			});

			// And: the changes should be reflected in the database
			const dbTransaction = await repository.getTransactionById(createdTxn.id);
			expect(dbTransaction).toMatchObject(reviewedTransaction);
		});

		it('should update transaction status to rejected with a reason', async () => {
			// Given: a user exists with a pending transaction
			const userId = 1;
			const reviewerId = 2;
			await createUser(userId, 'Transaction User');
			await createUser(reviewerId, 'Reviewer User');

			const transaction = createTestTransaction(userId);
			const [createdTxn] = await db.insert(pointTransactionsTable).values(transaction).returning();

			// When: the transaction is rejected with a reason
			const reviewedTransaction = await repository.reviewTransaction(createdTxn.id, {
				reviewerId,
				status: 'rejected',
				rejectionReason: 'Invalid transaction'
			});

			// Then: the transaction should be updated with rejected status and reason
			expect(reviewedTransaction).toMatchObject({
				...transaction,
				status: 'rejected',
				reviewerId,
				reviewedAt: expect.any(Date),
				rejectionReason: 'Invalid transaction'
			});
		});

		it('should invalidate caches when reviewing a transaction', async () => {
			// Given: a user exists with a pending transaction
			const userId = 1;
			const reviewerId = 2;
			await createUser(userId, 'Transaction User');
			await createUser(reviewerId, 'Reviewer User');

			await db.insert(pointTransactionsTable).values(
				createTestTransaction(userId, {
					status: 'pending',
					amount: 100
				})
			);

			// And: the initial points are cached (pending positive transactions don't count)
			const initialTotal = await repository.getTotalPoints(userId);
			expect(initialTotal).toBe(0);

			// When: the transaction is approved
			const [transaction] = await db
				.select()
				.from(pointTransactionsTable)
				.where(eq(pointTransactionsTable.userId, userId));

			await repository.reviewTransaction(transaction.id, {
				reviewerId,
				status: 'approved'
			});

			// Then: getTotalPoints should return the approved amount
			const newTotal = await repository.getTotalPoints(userId);
			expect(newTotal).toBe(100);
		});
	});

	describe('getPendingTransactions', () => {
		it('should return an empty array when there are no pending transactions', async () => {
			// Given: a user exists with only approved transactions
			const userId = 1;
			await createUser(userId, 'Test User');
			await db
				.insert(pointTransactionsTable)
				.values([
					createTestTransaction(userId, { status: 'approved' }),
					createTestTransaction(userId, { status: 'rejected' })
				]);

			// When: getPendingTransactions is called
			const pendingTransactions = await repository.getPendingTransactions();

			// Then: an empty array should be returned
			expect(pendingTransactions).toEqual([]);
		});

		it('should return only pending transactions sorted by createdAt', async () => {
			// Given: multiple users exist with various transaction statuses
			const user1 = await createUser(1, 'User One');
			const user2 = await createUser(2, 'User Two');

			const transactions = [
				createTestTransaction(user1, {
					status: 'pending',
					createdAt: new Date('2023-01-01T00:00:00Z')
				}),
				createTestTransaction(user2, {
					status: 'pending',
					createdAt: new Date('2023-01-02T00:00:00Z')
				}),
				createTestTransaction(user1, { status: 'approved' }),
				createTestTransaction(user2, { status: 'rejected' })
			];

			await db.insert(pointTransactionsTable).values(transactions);

			// When: getPendingTransactions is called
			const pendingTransactions = await repository.getPendingTransactions();

			// Then: only pending transactions should be returned in chronological order
			expect(pendingTransactions).toHaveLength(2);
			expect(pendingTransactions.every((t) => t.status === 'pending')).toBe(true);
			expect(
				new Date(pendingTransactions[0].createdAt) <= new Date(pendingTransactions[1].createdAt)
			).toBe(true);
		});
	});

	describe('getTransactionById', () => {
		it('should return null for non-existent transaction', async () => {
			// Given: no transactions exist
			const nonExistentId = 999;

			// When: getTransactionById is called with a non-existent ID
			const transaction = await repository.getTransactionById(nonExistentId);

			// Then: null should be returned
			expect(transaction).toBeNull();
		});

		it('should return the transaction with the specified ID', async () => {
			// Given: a user exists with a transaction
			const userId = 1;
			await createUser(userId, 'Test User');
			const transaction = createTestTransaction(userId);
			const [createdTxn] = await db.insert(pointTransactionsTable).values(transaction).returning();

			// When: getTransactionById is called
			const retrievedTransaction = await repository.getTransactionById(createdTxn.id);

			// Then: the correct transaction should be returned
			expect(retrievedTransaction).toMatchObject(transaction);
		});
	});

	describe('getUserRank', () => {
		it('should return rank 0 for non-existent user', async () => {
			// Given: no users exist
			const nonExistentId = 999;

			// When: getUserRank is called with a non-existent ID
			const rank = await repository.getUserRank(nonExistentId);

			// Then: rank 0 should be returned
			expect(rank).toEqual({ rank: 0, totalUsers: 0 });
		});

		it('should calculate correct rank based on approved points', async () => {
			// Given: multiple users exist with various transactions
			const user1 = await createUser(1, 'First Place');
			const user2 = await createUser(2, 'Second Place');
			const user3 = await createUser(3, 'Third Place');

			// Create transactions in a specific order to ensure consistent ranking
			await db
				.insert(pointTransactionsTable)
				.values([
					createTestTransaction(user1, { status: 'approved', amount: 200 }),
					createTestTransaction(user2, { status: 'approved', amount: 150 }),
					createTestTransaction(user3, { status: 'approved', amount: 100 })
				]);

			// When: getUserRank is called for each user
			const rank1 = await repository.getUserRank(user1);
			const rank2 = await repository.getUserRank(user2);
			const rank3 = await repository.getUserRank(user3);

			// Then: ranks should be correct based on points
			expect(rank1).toEqual({ rank: 1, totalUsers: 3 });
			expect(rank2).toEqual({ rank: 2, totalUsers: 3 });
			expect(rank3).toEqual({ rank: 3, totalUsers: 3 });
		});

		it('should cache rank results', async () => {
			// Given: a user exists with an approved transaction
			const userId = 1;
			await createUser(userId, 'Cache Test User');
			await db
				.insert(pointTransactionsTable)
				.values(createTestTransaction(userId, { status: 'approved', amount: 100 }));

			// When: getUserRank is called multiple times
			const firstRank = await repository.getUserRank(userId);

			// And: a new transaction is added
			await db
				.insert(pointTransactionsTable)
				.values(createTestTransaction(userId, { status: 'approved', amount: 200 }));

			const secondRank = await repository.getUserRank(userId);

			// Then: both calls should return the cached value
			expect(firstRank).toEqual(secondRank);
		});
	});

	describe('getPointsStatistics', () => {
		it('should return zero statistics when no users exist', async () => {
			// When: getPointsStatistics is called with no users
			const stats = await repository.getPointsStatistics();

			// Then: all statistics should be zero
			expect(stats).toEqual({
				totalPointsAwarded: 0,
				averagePointsPerAttendee: 0,
				topEarner: {
					userId: 0,
					name: '',
					totalPoints: 0
				}
			});
		});

		it('should calculate correct statistics for multiple users', async () => {
			// Given: multiple users exist with various transactions
			const user1 = await createUser(1, 'Top Earner');
			const user2 = await createUser(2, 'Second Place');
			const user3 = await createUser(3, 'Third Place');

			// Create transactions one at a time to avoid any potential ordering issues
			await db
				.insert(pointTransactionsTable)
				.values(createTestTransaction(user1, { status: 'approved', amount: 300 }));
			await db
				.insert(pointTransactionsTable)
				.values(createTestTransaction(user2, { status: 'approved', amount: 200 }));
			await db
				.insert(pointTransactionsTable)
				.values(createTestTransaction(user3, { status: 'approved', amount: 100 }));
			// Add a rejected transaction that shouldn't count
			await db
				.insert(pointTransactionsTable)
				.values(createTestTransaction(user1, { status: 'rejected', amount: 50 }));

			// When: getPointsStatistics is called
			const stats = await repository.getPointsStatistics();

			// Then: statistics should be correctly calculated
			expect(stats).toEqual({
				totalPointsAwarded: 600, // 300 + 200 + 100
				averagePointsPerAttendee: 200, // 600 / 3
				topEarner: {
					userId: user1,
					name: 'Top Earner',
					totalPoints: 300
				}
			});
		});
	});

	describe('getLeaderboard', () => {
		it('should return an empty array when no users exist', async () => {
			// When: getLeaderboard is called with no users
			const leaderboard = await repository.getLeaderboard();

			// Then: an empty array should be returned
			expect(leaderboard).toEqual([]);
		});

		it('should return top users sorted by points with their transactions', async () => {
			// Given: multiple users exist with various transactions
			const user1 = await createUser(1, 'First Place');
			const user2 = await createUser(2, 'Second Place');
			const user3 = await createUser(3, 'Third Place');

			const transactions = [
				createTestTransaction(user1, { status: 'approved', amount: 300 }),
				createTestTransaction(user2, { status: 'approved', amount: 200 }),
				createTestTransaction(user3, { status: 'approved', amount: 100 }),
				createTestTransaction(user1, { status: 'pending', amount: -50 }), // Negative pending should count
				createTestTransaction(user2, { status: 'rejected', amount: 50 }) // Should not count
			];

			await db.insert(pointTransactionsTable).values(transactions);

			// When: getLeaderboard is called
			const leaderboard = await repository.getLeaderboard();

			// Then: users should be sorted by points and include their transactions
			expect(leaderboard).toHaveLength(3);
			expect(leaderboard[0].userId).toBe(user1);
			expect(leaderboard[0].totalPoints).toBe(250); // 300 - 50
			expect(leaderboard[0].transactions).toHaveLength(2);
			expect(leaderboard[1].userId).toBe(user2);
			expect(leaderboard[1].totalPoints).toBe(200);
			expect(leaderboard[1].transactions).toHaveLength(1);
			expect(leaderboard[2].userId).toBe(user3);
			expect(leaderboard[2].totalPoints).toBe(100);
			expect(leaderboard[2].transactions).toHaveLength(1);
		});

		it('should limit results to top 10 users', async () => {
			// Given: more than 10 users exist with transactions
			const users = await Promise.all(
				Array.from({ length: 15 }, (_, i) => createUser(i + 1, `User ${i + 1}`))
			);

			// Create transactions with descending points
			await db.insert(pointTransactionsTable).values(
				users.map((userId, index) =>
					createTestTransaction(userId, {
						status: 'approved',
						amount: 1000 - index * 50
					})
				)
			);

			// When: getLeaderboard is called
			const leaderboard = await repository.getLeaderboard();

			// Then: only top 10 users should be returned
			expect(leaderboard).toHaveLength(10);
			expect(leaderboard[0].totalPoints).toBe(1000);
			expect(leaderboard[9].totalPoints).toBe(550);
		});
	});
});
