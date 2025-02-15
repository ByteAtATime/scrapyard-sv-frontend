import { describe, it, expect } from 'vitest';
import { ShopItem, shopItemJsonSchema } from './shop-item';
import type { ShopItemData } from './types';

describe('ShopItem', () => {
	const mockData: ShopItemData = {
		id: 1,
		name: 'Test Item',
		description: 'Test Description',
		imageUrl: 'https://example.com/image.jpg',
		price: 100,
		stock: 10,
		isOrderable: true,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01')
	};

	describe('getters', () => {
		it('should provide access to all properties through getters', () => {
			const item = new ShopItem(mockData);

			expect(item.id).toBe(mockData.id);
			expect(item.name).toBe(mockData.name);
			expect(item.description).toBe(mockData.description);
			expect(item.imageUrl).toBe(mockData.imageUrl);
			expect(item.price).toBe(mockData.price);
			expect(item.stock).toBe(mockData.stock);
			expect(item.isOrderable).toBe(mockData.isOrderable);
			expect(item.createdAt).toBe(mockData.createdAt);
			expect(item.updatedAt).toBe(mockData.updatedAt);
		});

		it('should handle empty strings in getters', () => {
			const item = new ShopItem({
				...mockData,
				name: '',
				description: '',
				imageUrl: ''
			});

			expect(item.name).toBe('');
			expect(item.description).toBe('');
			expect(item.imageUrl).toBe('');
		});

		it('should handle zero values in getters', () => {
			const item = new ShopItem({
				...mockData,
				id: 0,
				price: 0,
				stock: 0
			});

			expect(item.id).toBe(0);
			expect(item.price).toBe(0);
			expect(item.stock).toBe(0);
		});

		it('should handle negative values in getters', () => {
			const item = new ShopItem({
				...mockData,
				price: -100,
				stock: -10
			});

			expect(item.price).toBe(-100);
			expect(item.stock).toBe(-10);
		});

		it('should handle different date formats in getters', () => {
			const now = new Date();
			const item = new ShopItem({
				...mockData,
				createdAt: now,
				updatedAt: now
			});

			expect(item.createdAt).toBe(now);
			expect(item.updatedAt).toBe(now);
		});
	});

	describe('canBePurchased', () => {
		it('should return true when item is orderable and in stock', () => {
			const item = new ShopItem(mockData);
			expect(item.canBePurchased()).toBe(true);
		});

		it('should return false when item is not orderable', () => {
			const item = new ShopItem({ ...mockData, isOrderable: false });
			expect(item.canBePurchased()).toBe(false);
		});

		it('should return false when item is out of stock', () => {
			const item = new ShopItem({ ...mockData, stock: 0 });
			expect(item.canBePurchased()).toBe(false);
		});

		it('should return false when item has negative stock', () => {
			const item = new ShopItem({ ...mockData, stock: -1 });
			expect(item.canBePurchased()).toBe(false);
		});
	});

	describe('toJson', () => {
		it('should convert ShopItem to JSON format with all fields', () => {
			const item = new ShopItem(mockData);
			const json = item.toJson();
			expect(json).toEqual({
				id: mockData.id,
				name: mockData.name,
				description: mockData.description,
				imageUrl: mockData.imageUrl,
				price: mockData.price,
				stock: mockData.stock,
				isOrderable: mockData.isOrderable,
				createdAt: mockData.createdAt,
				updatedAt: mockData.updatedAt
			});
		});

		it('should validate against JSON schema', () => {
			const item = new ShopItem(mockData);
			const json = item.toJson();
			const result = shopItemJsonSchema.safeParse(json);
			expect(result.success).toBe(true);
		});

		it('should handle empty strings in JSON conversion', () => {
			const item = new ShopItem({
				...mockData,
				name: '',
				description: '',
				imageUrl: ''
			});
			const json = item.toJson();
			const result = shopItemJsonSchema.safeParse(json);
			expect(result.success).toBe(true);
			expect(json.name).toBe('');
			expect(json.description).toBe('');
			expect(json.imageUrl).toBe('');
		});

		it('should handle zero values in JSON conversion', () => {
			const item = new ShopItem({
				...mockData,
				id: 0,
				price: 0,
				stock: 0
			});
			const json = item.toJson();
			const result = shopItemJsonSchema.safeParse(json);
			expect(result.success).toBe(true);
			expect(json.id).toBe(0);
			expect(json.price).toBe(0);
			expect(json.stock).toBe(0);
		});

		it('should handle negative values in JSON conversion', () => {
			const item = new ShopItem({
				...mockData,
				price: -100,
				stock: -10
			});
			const json = item.toJson();
			const result = shopItemJsonSchema.safeParse(json);
			expect(result.success).toBe(true);
			expect(json.price).toBe(-100);
			expect(json.stock).toBe(-10);
		});
	});
});
