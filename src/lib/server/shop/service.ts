import type {
	IShopService,
	IShopRepo,
	CreateShopItemData,
	UpdateShopItemData,
	OrderStatus
} from './types';
import { ItemNotFoundError, OrderNotFoundError } from './types';
import { ShopItem } from './shop-item';
import { Order } from './order';

export class ShopService implements IShopService {
	constructor(private readonly repository: IShopRepo) {}

	async getAllItems(onlyOrderable: boolean = false): Promise<ShopItem[]> {
		const items = await this.repository.getAllItems();
		if (onlyOrderable) {
			return items.filter((item) => item.isOrderable);
		}
		return items;
	}

	async getItemById(id: number): Promise<ShopItem> {
		const item = await this.repository.getItemById(id);
		if (!item) {
			throw new ItemNotFoundError(id);
		}
		return item;
	}

	async createItem(data: CreateShopItemData): Promise<ShopItem> {
		return await this.repository.createItem(data);
	}

	async updateItem(id: number, data: UpdateShopItemData): Promise<void> {
		const item = await this.repository.getItemById(id);
		if (!item) {
			throw new ItemNotFoundError(id);
		}
		await this.repository.updateItem(id, data);
	}

	async deleteItem(id: number): Promise<void> {
		const item = await this.repository.getItemById(id);
		if (!item) {
			throw new ItemNotFoundError(id);
		}
		await this.repository.deleteItem(id);
	}

	async purchaseItem(userId: number, itemId: number): Promise<Order> {
		return await this.repository.purchaseItem(userId, itemId);
	}

	async getOrders(): Promise<Order[]> {
		return await this.repository.getOrders();
	}

	async getOrderById(orderId: number): Promise<Order> {
		const order = await this.repository.getOrderById(orderId);
		if (!order) {
			throw new OrderNotFoundError(orderId);
		}
		return order;
	}

	async getOrdersByUser(userId: number): Promise<Order[]> {
		return await this.repository.getOrdersByUser(userId);
	}

	async updateOrderStatus(orderId: number, status: OrderStatus): Promise<void> {
		const order = await this.repository.getOrderById(orderId);
		if (!order) {
			throw new OrderNotFoundError(orderId);
		}
		if (!order.canBeUpdated()) {
			throw new Error(`Order ${orderId} cannot be updated because it is ${order.status}`);
		}
		await this.repository.updateOrderStatus(orderId, status);
	}
}
