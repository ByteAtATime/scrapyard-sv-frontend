import { describe, it, expect } from 'vitest';
import { Order, orderJsonSchema } from './order';
import type { OrderData } from './types';

describe('Order', () => {
	const mockData: OrderData = {
		id: 1,
		userId: 2,
		shopItemId: 3,
		status: 'pending',
		createdAt: new Date('2024-01-01')
	};

	describe('getters', () => {
		it('should provide access to all properties through getters', () => {
			const order = new Order(mockData);

			expect(order.id).toBe(mockData.id);
			expect(order.userId).toBe(mockData.userId);
			expect(order.shopItemId).toBe(mockData.shopItemId);
			expect(order.status).toBe(mockData.status);
			expect(order.createdAt).toBe(mockData.createdAt);
		});

		it('should handle zero values in getters', () => {
			const order = new Order({
				...mockData,
				id: 0,
				userId: 0,
				shopItemId: 0
			});

			expect(order.id).toBe(0);
			expect(order.userId).toBe(0);
			expect(order.shopItemId).toBe(0);
		});

		it('should handle different date formats in getters', () => {
			const now = new Date();
			const order = new Order({
				...mockData,
				createdAt: now
			});

			expect(order.createdAt).toBe(now);
		});

		it('should handle different order statuses in getters', () => {
			const statuses: Array<'pending' | 'fulfilled' | 'cancelled'> = [
				'pending',
				'fulfilled',
				'cancelled'
			];

			for (const status of statuses) {
				const order = new Order({ ...mockData, status });
				expect(order.status).toBe(status);
			}
		});
	});

	describe('canBeUpdated', () => {
		it('should return true when order is pending', () => {
			const order = new Order(mockData);
			expect(order.canBeUpdated()).toBe(true);
		});

		it('should return false when order is fulfilled', () => {
			const order = new Order({ ...mockData, status: 'fulfilled' });
			expect(order.canBeUpdated()).toBe(false);
		});

		it('should return false when order is cancelled', () => {
			const order = new Order({ ...mockData, status: 'cancelled' });
			expect(order.canBeUpdated()).toBe(false);
		});
	});

	describe('toJson', () => {
		it('should convert Order to JSON format with all fields', () => {
			const order = new Order(mockData);
			const json = order.toJson();
			expect(json).toEqual({
				id: mockData.id,
				userId: mockData.userId,
				shopItemId: mockData.shopItemId,
				status: mockData.status,
				createdAt: mockData.createdAt
			});
		});

		it('should validate against JSON schema', () => {
			const order = new Order(mockData);
			const json = order.toJson();
			const result = orderJsonSchema.safeParse(json);
			expect(result.success).toBe(true);
		});

		it('should handle zero values in JSON conversion', () => {
			const order = new Order({
				...mockData,
				id: 0,
				userId: 0,
				shopItemId: 0
			});
			const json = order.toJson();
			const result = orderJsonSchema.safeParse(json);
			expect(result.success).toBe(true);
			expect(json.id).toBe(0);
			expect(json.userId).toBe(0);
			expect(json.shopItemId).toBe(0);
		});

		it('should validate schema with different statuses', () => {
			const statuses: Array<'pending' | 'fulfilled' | 'cancelled'> = [
				'pending',
				'fulfilled',
				'cancelled'
			];

			for (const status of statuses) {
				const order = new Order({ ...mockData, status });
				const json = order.toJson();
				const result = orderJsonSchema.safeParse(json);
				expect(result.success).toBe(true);
				expect(json.status).toBe(status);
			}
		});
	});
});
