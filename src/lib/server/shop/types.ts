import type { InferSelectModel } from 'drizzle-orm';
import type { shopItemsTable } from '../db/schema';

export type ShopItem = InferSelectModel<typeof shopItemsTable>;

export type CreateShopItemData = Omit<ShopItem, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateShopItemData = Partial<CreateShopItemData>;

export interface IShopRepository {
	getAllItems(): Promise<ShopItem[]>;
	getItemById(id: number): Promise<ShopItem | null>;
	updateStock(id: number, newStock: number): Promise<void>;
	createItem(data: CreateShopItemData): Promise<ShopItem>;
	updateItem(id: number, data: UpdateShopItemData): Promise<void>;
	deleteItem(id: number): Promise<void>;
}
