import type { InferSelectModel } from 'drizzle-orm';
import type { ordersTable, orderStatusEnum, shopItemsTable } from '../db/schema';
import type { ShopItem } from './shop-item';
import type { Order } from './order';

// Raw data types from database
export type ShopItemData = InferSelectModel<typeof shopItemsTable>;
export type OrderData = InferSelectModel<typeof ordersTable>;

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export type CreateShopItemData = Omit<ShopItemData, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateShopItemData = Partial<CreateShopItemData>;

export interface CreateOrderData {
	userId: number;
	shopItemId: number;
	status: OrderStatus;
}

export class ShopError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ShopError';
	}
}

export class ItemNotFoundError extends ShopError {
	constructor(itemId: number) {
		super(`Item with ID ${itemId} not found.`);
		this.name = 'ItemNotFoundError';
	}
}

export class ItemNotOrderableError extends ShopError {
	constructor(itemId: number) {
		super(`Item with ID ${itemId} is not orderable.`);
		this.name = 'ItemNotOrderableError';
	}
}

export class InsufficientStockError extends ShopError {
	constructor(itemName: string) {
		super(`Not enough stock for item: ${itemName}`);
		this.name = 'InsufficientStockError';
	}
}

export class OrderNotFoundError extends ShopError {
	constructor(orderId: number) {
		super(`Order with ID ${orderId} not found.`);
		this.name = 'OrderNotFoundError';
	}
}

export interface IShopRepo {
	// Item operations
	getAllItems(): Promise<ShopItem[]>;
	getItemById(id: number): Promise<ShopItem | null>;
	updateStock(id: number, newStock: number): Promise<void>;
	createItem(data: CreateShopItemData): Promise<ShopItem>;
	updateItem(id: number, data: UpdateShopItemData): Promise<void>;
	deleteItem(id: number): Promise<void>;

	// Order operations
	getOrders(): Promise<Order[]>;
	getOrderById(orderId: number): Promise<Order | null>;
	getOrdersByUser(userId: number): Promise<Order[]>;
	createOrder(data: CreateOrderData): Promise<Order>;
	updateOrderStatus(orderId: number, status: OrderStatus): Promise<void>;

	// Transaction operations
	purchaseItem(userId: number, itemId: number): Promise<Order>;
}

export interface IShopService {
	// Item operations
	getAllItems(onlyOrderable?: boolean): Promise<ShopItem[]>;
	getItemById(id: number): Promise<ShopItem>;
	createItem(data: CreateShopItemData): Promise<ShopItem>;
	updateItem(id: number, data: UpdateShopItemData): Promise<void>;
	deleteItem(id: number): Promise<void>;

	// Order operations
	purchaseItem(userId: number, itemId: number): Promise<Order>;
	getOrders(): Promise<Order[]>;
	getOrderById(orderId: number): Promise<Order>;
	getOrdersByUser(userId: number): Promise<Order[]>;
	updateOrderStatus(orderId: number, status: OrderStatus): Promise<void>;
}
