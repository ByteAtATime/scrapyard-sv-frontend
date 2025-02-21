import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PointsService } from './service';
import type { IPointsRepo } from './types';
import type { PointTransactionData } from '../db/types';
import { MockAuthProvider } from '../auth/mock';
import { PointTransaction } from './transaction';
import { MockPointsRepo } from './mock';

describe('PointsService', () => {
	let mockRepo: IPointsRepo;
	let mockAuthProvider: MockAuthProvider;
	let service: PointsService;

	beforeEach(() => {
		mockRepo = new MockPointsRepo();

		mockAuthProvider = new MockAuthProvider();
		service = new PointsService(mockRepo, mockAuthProvider);
		vi.clearAllMocks();
	});

	describe('getTotalPoints', () => {
		it('should return total points from repository', async () => {
			vi.mocked(mockRepo.getTotalPoints).mockResolvedValueOnce(100);

			const result = await service.getTotalPoints(1);
			expect(result).toBe(100);
			expect(mockRepo.getTotalPoints).toHaveBeenCalledWith(1);
		});
	});

	describe('getTransactions', () => {
		it('should return all transactions as PointTransaction instances', async () => {
			const mockTransactionData = { id: 1, userId: 1, amount: 100 } as PointTransactionData;
			vi.mocked(mockRepo.getTransactions).mockResolvedValueOnce([mockTransactionData]);

			const result = await service.getTransactions();
			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(PointTransaction);
			expect(result[0]).toMatchObject({ id: 1, userId: 1, amount: 100 });
		});
	});

	describe('getTransactionsByUser', () => {
		it('should return user transactions as PointTransaction instances', async () => {
			const mockTransactionData = { id: 1, userId: 1, amount: 100 } as PointTransactionData;
			vi.mocked(mockRepo.getTransactionsByUser).mockResolvedValueOnce([mockTransactionData]);

			const result = await service.getTransactionsByUser(1);
			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(PointTransaction);
			expect(result[0]).toMatchObject({ id: 1, userId: 1, amount: 100 });
		});

		it('should return empty array when user has no transactions', async () => {
			vi.mocked(mockRepo.getTransactionsByUser).mockResolvedValueOnce([]);

			const result = await service.getTransactionsByUser(1);
			expect(result).toEqual([]);
		});
	});

	describe('createTransaction', () => {
		it('should create transaction through repository', async () => {
			const mockTransaction = { id: 1 } as PointTransactionData;
			vi.mocked(mockRepo.createTransaction).mockResolvedValueOnce(mockTransaction);

			const result = await service.createTransaction({
				userId: 1,
				amount: 100,
				reason: 'Test',
				authorId: 2
			});

			expect(result).toEqual(mockTransaction);
			expect(mockRepo.createTransaction).toHaveBeenCalledWith({
				userId: 1,
				amount: 100,
				reason: 'Test',
				authorId: 2
			});
		});
	});

	describe('reviewTransaction', () => {
		it('should review transaction through repository', async () => {
			const mockTransaction = { id: 1, userId: 1, amount: 100 } as PointTransactionData;
			vi.mocked(mockRepo.getTransactionById).mockResolvedValueOnce(mockTransaction);
			vi.mocked(mockRepo.reviewTransaction).mockResolvedValueOnce(mockTransaction);

			const result = await service.reviewTransaction(1, {
				reviewerId: 2,
				status: 'approved'
			});

			expect(result).toEqual(mockTransaction);
			expect(mockRepo.getTransactionById).toHaveBeenCalledWith(1);
			expect(mockRepo.reviewTransaction).toHaveBeenCalledWith(1, {
				reviewerId: 2,
				status: 'approved'
			});
		});

		it('should throw error when transaction is not found', async () => {
			vi.mocked(mockRepo.getTransactionById).mockResolvedValueOnce(null);

			await expect(
				service.reviewTransaction(1, {
					reviewerId: 2,
					status: 'approved'
				})
			).rejects.toThrow('Transaction not found');
		});

		it('should throw error when reviewer tries to approve their own transaction', async () => {
			const mockTransaction = { id: 1, userId: 1, amount: 100 } as PointTransactionData;
			vi.mocked(mockRepo.getTransactionById).mockResolvedValueOnce(mockTransaction);

			await expect(
				service.reviewTransaction(1, {
					reviewerId: 1,
					status: 'approved'
				})
			).rejects.toThrow('Cannot approve your own transaction');
		});
	});

	describe('getPendingTransactions', () => {
		it('should return pending transactions from repository', async () => {
			const mockTransactions = [{ id: 1 } as PointTransactionData];
			vi.mocked(mockRepo.getPendingTransactions).mockResolvedValueOnce(mockTransactions);

			const result = await service.getPendingTransactions();
			expect(result).toEqual(mockTransactions);
			expect(mockRepo.getPendingTransactions).toHaveBeenCalled();
		});
	});

	describe('getTransactionById', () => {
		it('should return transaction from repository', async () => {
			const mockTransaction = { id: 1 } as PointTransactionData;
			vi.mocked(mockRepo.getTransactionById).mockResolvedValueOnce(mockTransaction);

			const result = await service.getTransactionById(1);
			expect(result).toEqual(mockTransaction);
			expect(mockRepo.getTransactionById).toHaveBeenCalledWith(1);
		});

		it('should return null when transaction not found', async () => {
			vi.mocked(mockRepo.getTransactionById).mockResolvedValueOnce(null);

			const result = await service.getTransactionById(999);
			expect(result).toBeNull();
			expect(mockRepo.getTransactionById).toHaveBeenCalledWith(999);
		});
	});
});
