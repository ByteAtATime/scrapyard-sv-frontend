import type { InferSelectModel } from 'drizzle-orm';
import type { ordersTable, orderStatusEnum, shopItemsTable } from '../db/schema';

export type ShopItem = InferSelectModel<typeof shopItemsTable>;

export type CreateShopItemData = Omit<ShopItem, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateShopItemData = Partial<CreateShopItemData>;

export type Order = InferSelectModel<typeof ordersTable>;

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export interface IShopRepository {
	getAllItems(onlyOrderable?: boolean): Promise<ShopItem[]>;
	getItemById(id: number): Promise<ShopItem | null>;
	updateStock(id: number, newStock: number): Promise<void>;
	createItem(data: CreateShopItemData): Promise<ShopItem>;
	updateItem(id: number, data: UpdateShopItemData): Promise<void>;
	deleteItem(id: number): Promise<void>;
	createOrder(userId: number, itemId: number): Promise<Order>;
	getOrders(): Promise<Order[]>;
	getOrderById(orderId: number): Promise<Order | null>;
	getOrdersByUser(userId: number): Promise<Order[]>;
	updateOrderStatus(orderId: number, status: OrderStatus): Promise<void>;
}
