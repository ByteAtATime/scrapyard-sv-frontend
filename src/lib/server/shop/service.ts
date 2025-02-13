import type { IShopService, IShopRepo, Order, OrderStatus } from './types';
import type { ShopItem, CreateShopItemData, UpdateShopItemData } from './types';
import { db } from '../db';
import { eq, sql } from 'drizzle-orm';
import { pointTransactionsTable, usersTable } from '../db/schema';

export class ShopService implements IShopService {
	constructor(private readonly repository: IShopRepo) {}

	async getAllItems(onlyOrderable: boolean = false): Promise<ShopItem[]> {
		const items = await this.repository.getAllItems();
		if (onlyOrderable) {
			return items.filter((item) => item.isOrderable);
		}
		return items;
	}

	async getItemById(id: number): Promise<ShopItem | null> {
		return await this.repository.getItemById(id);
	}

	async createItem(data: CreateShopItemData): Promise<ShopItem> {
		return await this.repository.createItem(data);
	}

	async updateItem(id: number, data: UpdateShopItemData): Promise<void> {
		await this.repository.updateItem(id, data);
	}

	async deleteItem(id: number): Promise<void> {
		await this.repository.deleteItem(id);
	}

	async purchaseItem(userId: number, itemId: number): Promise<Order> {
		return db.transaction(async (tx) => {
			const item = await this.repository.getItemById(itemId);

			if (!item) {
				throw new Error(`Item with ID ${itemId} not found.`);
			}

			if (!item.isOrderable) {
				throw new Error(`Item with ID ${itemId} is not orderable.`);
			}

			if (item.stock <= 0) {
				throw new Error(`Not enough stock for item: ${item.name}`);
			}

			const order = await this.repository.createOrder({
				userId,
				shopItemId: itemId,
				status: 'pending'
			});

			await this.repository.updateStock(itemId, item.stock - 1);

			await tx
				.update(usersTable)
				.set({
					totalPoints: sql`${usersTable.totalPoints} - ${item.price}`
				})
				.where(eq(usersTable.id, userId));

			await tx.insert(pointTransactionsTable).values({
				userId: userId,
				amount: -item.price,
				reason: `Purchased item: ${item.name}`,
				authorId: userId
			});

			return order;
		});
	}

	async getOrders(): Promise<Order[]> {
		return await this.repository.getOrders();
	}

	async getOrderById(orderId: number): Promise<Order | null> {
		return await this.repository.getOrderById(orderId);
	}

	async getOrdersByUser(userId: number): Promise<Order[]> {
		return await this.repository.getOrdersByUser(userId);
	}

	async updateOrderStatus(orderId: number, status: OrderStatus): Promise<void> {
		await this.repository.updateOrderStatus(orderId, status);
	}
}
