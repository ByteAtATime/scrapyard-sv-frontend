import { vi } from 'vitest';
import type { IPointsRepository } from './types';

export class MockPointsRepository implements IPointsRepository {
	getTotalPoints = vi.fn();
	awardPoints = vi.fn();
	getTransactions = vi.fn();
	reviewTransaction = vi.fn();
	getPointsStatistics = vi.fn();
}
