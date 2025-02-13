import { vi } from 'vitest';
import { type IShopRepo } from './types';

export class MockShopRepo implements IShopRepo {
	getAllItems = vi.fn();
	getItemById = vi.fn();
	updateStock = vi.fn();
	createItem = vi.fn();
	updateItem = vi.fn();
	deleteItem = vi.fn();
	getOrders = vi.fn();
	getOrderById = vi.fn();
	getOrdersByUser = vi.fn();
	createOrder = vi.fn();
	updateOrderStatus = vi.fn();
}
