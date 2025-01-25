import { describe, it, expect } from 'vitest';
import { PointTransaction } from './transaction';
import type { PointTransactionData } from '$lib/server/db/types';
import { MockAuthProvider } from '../auth/mock';

describe('PointTransaction', () => {
	const mockData: PointTransactionData = {
		id: 1,
		userId: 101,
		amount: 50,
		reason: 'Test',
		authorId: 1,
		createdAt: new Date('2024-01-15T12:00:00Z'),
		status: 'pending',
		reviewerId: null,
		reviewedAt: null,
		rejectionReason: null
	};

	const authProvider = new MockAuthProvider();

	it('should correctly initialize with data', () => {
		const transaction = new PointTransaction(mockData, authProvider);
		expect(transaction.id).toBe(mockData.id);
		expect(transaction.userId).toBe(mockData.userId);
		expect(transaction.amount).toBe(mockData.amount);
		expect(transaction.reason).toBe(mockData.reason);
		expect(transaction.authorId).toBe(mockData.authorId);
		expect(transaction.createdAt).toEqual(mockData.createdAt);
	});

	it('should return correct values for getters', () => {
		const transaction = new PointTransaction(mockData, authProvider);
		expect(transaction.id).toBe(1);
		expect(transaction.userId).toBe(101);
		expect(transaction.amount).toBe(50);
		expect(transaction.reason).toBe('Test');
		expect(transaction.authorId).toBe(1);
		expect(transaction.createdAt).toEqual(new Date('2024-01-15T12:00:00Z'));
	});

	it('should correctly serialize to JSON', () => {
		const transaction = new PointTransaction(mockData, authProvider);

		authProvider.getUserById.mockImplementation((id) => ({
			id,
			name: `User ${id}`,
			email: `user${id}@example.com`
		}));

		const json = transaction.toJson();
		expect(json).toEqual({
			...mockData,
			user: {
				id: mockData.userId,
				name: `User ${mockData.userId}`,
				email: `user${mockData.userId}@example.com`
			},
			author: {
				id: mockData.authorId,
				name: `User ${mockData.authorId}`,
				email: `user${mockData.authorId}@example.com`
			},
			reviewer: null
		});
	});
});
