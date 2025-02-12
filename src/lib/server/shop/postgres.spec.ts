import { describe, it, expect, vi } from 'vitest';
import { PostgresShopRepo } from './postgres';
import { shopItemsTable } from '../db/schema';
import type { ShopItem, CreateShopItemData, UpdateShopItemData } from './types';
import { eq } from 'drizzle-orm';

const mockDb = await vi.hoisted(async () => {
	const { mockDb } = await import('$lib/server/db/mock');
	return mockDb;
});

describe('PostgresShopProvider', () => {
	const mockShopItem: ShopItem = {
		id: 1,
		name: 'Test Item',
		description: 'Test Description',
		imageUrl: 'test.jpg',
		price: 99.99,
		stock: 10,
		isOrderable: true,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	describe('getAllItems', () => {
		it('should return all shop items ordered by ID', async () => {
			const mockItems = [mockShopItem, { ...mockShopItem, id: 2 }];
			mockDb.select().from(shopItemsTable).orderBy.mockResolvedValue(mockItems);

			const repo = new PostgresShopRepo();
			const result = await repo.getAllItems();

			expect(result).toEqual(mockItems);
			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.orderBy).toHaveBeenCalledWith(shopItemsTable.id);
		});

		it('should return empty array when no items exist', async () => {
			mockDb.select().from(shopItemsTable).orderBy.mockResolvedValue([]);

			const repo = new PostgresShopRepo();
			const result = await repo.getAllItems();

			expect(result).toEqual([]);
		});
	});

	describe('getItemById', () => {
		it('should return item when found', async () => {
			mockDb.select().from(shopItemsTable).where.mockResolvedValue([mockShopItem]);

			const repo = new PostgresShopRepo();
			const result = await repo.getItemById(1);

			expect(result).toEqual(mockShopItem);
			expect(mockDb.where).toHaveBeenCalledWith(eq(shopItemsTable.id, 1));
		});

		it('should return null when item not found', async () => {
			mockDb.select().from(shopItemsTable).where.mockResolvedValue([]);

			const repo = new PostgresShopRepo();
			const result = await repo.getItemById(999);

			expect(result).toBeNull();
		});
	});

	describe('updateStock', () => {
		it('should update stock quantity for specified item', async () => {
			const newStock = 5;

			const repo = new PostgresShopRepo();
			await repo.updateStock(1, newStock);

			expect(mockDb.update).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.set).toHaveBeenCalledWith({ stock: newStock });
			expect(mockDb.where).toHaveBeenCalledWith(eq(shopItemsTable.id, 1));
		});
	});

	describe('createItem', () => {
		it('should create new shop item and return created item', async () => {
			const createData: CreateShopItemData = {
				name: 'New Item',
				description: 'New Description',
				imageUrl: 'new.jpg',
				price: 49.99,
				stock: 20,
				isOrderable: true
			};

			mockDb.insert(shopItemsTable).values.mockReturnThis();
			mockDb.returning.mockResolvedValue([mockShopItem]);

			const repo = new PostgresShopRepo();
			const result = await repo.createItem(createData);

			expect(result).toEqual(mockShopItem);
			expect(mockDb.insert).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.values).toHaveBeenCalledWith(createData);
		});
	});

	describe('updateItem', () => {
		it('should update item with provided data and set updatedAt', async () => {
			const updateData: UpdateShopItemData = {
				name: 'Updated Name',
				price: 129.99,
				stock: 15
			};

			const repo = new PostgresShopRepo();
			await repo.updateItem(1, updateData);

			expect(mockDb.update).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.set).toHaveBeenCalledWith({
				...updateData,
				updatedAt: expect.any(Date)
			});
			expect(mockDb.where).toHaveBeenCalledWith(eq(shopItemsTable.id, 1));
		});
	});

	describe('deleteItem', () => {
		it('should delete specified item', async () => {
			const repo = new PostgresShopRepo();
			await repo.deleteItem(1);

			expect(mockDb.delete).toHaveBeenCalledWith(shopItemsTable);
			expect(mockDb.where).toHaveBeenCalledWith(eq(shopItemsTable.id, 1));
		});
	});
});
