import { vi } from 'vitest';
import type { IPointsRepo } from './types';

export class MockPointsRepo implements IPointsRepo {
	awardPoints = vi.fn();
	getTotalPoints = vi.fn();
	getTransactions = vi.fn();
	getTransactionsByUser = vi.fn();
	createTransaction = vi.fn();
	reviewTransaction = vi.fn();
	getPendingTransactions = vi.fn();
	getTransactionById = vi.fn();
	getPointsStatistics = vi.fn();
	getLeaderboard = vi.fn();
	getUserRank = vi.fn();
}
