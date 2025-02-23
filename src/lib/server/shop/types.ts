import type { InferSelectModel } from 'drizzle-orm';
import type { ordersTable, orderStatusEnum, shopItemsTable } from '../db/schema';
import type { ShopItem } from './shop-item';
import type { Order } from './order';
import type { ApiError } from '$lib/server/endpoints/types';

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

// Domain Errors
export class ShopError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ShopError';
	}
}

export class ItemNotFoundError extends ShopError {
	constructor(itemId: number) {
		super(`Item with ID ${itemId} not found`);
		this.name = 'ItemNotFoundError';
	}
}

export class ItemNotOrderableError extends ShopError {
	constructor(itemId: number) {
		super(`Item with ID ${itemId} is not orderable`);
		this.name = 'ItemNotOrderableError';
	}
}

export class InsufficientStockError extends ShopError {
	constructor(itemId: number) {
		super(`Item with ID ${itemId} is out of stock`);
		this.name = 'InsufficientStockError';
	}
}

export class InsufficientBalanceError extends ShopError {
	constructor(userId: number, required: number, available: number) {
		super(
			`User ${userId} has insufficient balance (required: ${required}, available: ${available})`
		);
		this.name = 'InsufficientBalanceError';
	}
}

export class OrderNotFoundError extends ShopError {
	constructor(orderId: number) {
		super(`Order with ID ${orderId} not found`);
		this.name = 'OrderNotFoundError';
	}
}

export class OrderNotUpdatableError extends ShopError {
	constructor(orderId: number, status: OrderStatus) {
		super(`Order ${orderId} cannot be updated because it is ${status}`);
		this.name = 'OrderNotUpdatableError';
	}
}

export class NotAuthenticatedError extends ShopError {
	constructor() {
		super('User is not authenticated');
		this.name = 'NotAuthenticatedError';
	}
}

export class NotOrganizerError extends ShopError {
	constructor() {
		super('User is not an organizer');
		this.name = 'NotOrganizerError';
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
	purchaseItem(itemId: number): Promise<Order | ApiError>;
	getOrders(): Promise<Order[]>;
	getOrderById(orderId: number): Promise<Order>;
	getOrdersByUser(userId: number): Promise<Order[]>;
	updateOrderStatus(orderId: number, status: OrderStatus): Promise<void>;
}
