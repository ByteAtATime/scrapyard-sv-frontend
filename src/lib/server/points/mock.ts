import { vi } from 'vitest';
import type { IPointsRepo } from './types';

export class MockPointsRepo implements IPointsRepo {
	getTotalPoints = vi.fn();
	awardPoints = vi.fn();
	getTransactions = vi.fn();
	getTransactionsByUser = vi.fn();
	reviewTransaction = vi.fn();
	getPointsStatistics = vi.fn();
}
