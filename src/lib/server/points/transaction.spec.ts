import { describe, it, expect } from 'vitest';
import { PointTransaction } from './transaction';
import type { PointTransactionData } from '$lib/server/db/types';

describe('PointTransaction', () => {
	const mockData: PointTransactionData = {
		id: 1,
		userId: 101,
		amount: 50,
		reason: 'Test',
		authorId: 1,
		createdAt: new Date('2024-01-15T12:00:00Z')
	};

	it('should correctly initialize with data', () => {
		const transaction = new PointTransaction(mockData);
		expect(transaction.id).toBe(mockData.id);
		expect(transaction.userId).toBe(mockData.userId);
		expect(transaction.amount).toBe(mockData.amount);
		expect(transaction.reason).toBe(mockData.reason);
		expect(transaction.authorId).toBe(mockData.authorId);
		expect(transaction.createdAt).toEqual(mockData.createdAt);
	});

	it('should return correct values for getters', () => {
		const transaction = new PointTransaction(mockData);
		expect(transaction.id).toBe(1);
		expect(transaction.userId).toBe(101);
		expect(transaction.amount).toBe(50);
		expect(transaction.reason).toBe('Test');
		expect(transaction.authorId).toBe(1);
		expect(transaction.createdAt).toEqual(new Date('2024-01-15T12:00:00Z'));
	});

	it('should correctly serialize to JSON', () => {
		const transaction = new PointTransaction(mockData);
		const json = transaction.toJson();
		expect(json).toEqual({
			id: 1,
			userId: 101,
			amount: 50,
			reason: 'Test',
			authorId: 1,
			createdAt: new Date('2024-01-15T12:00:00Z')
		});
	});
});
