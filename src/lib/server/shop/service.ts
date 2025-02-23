import type {
	IShopService,
	IShopRepo,
	CreateShopItemData,
	UpdateShopItemData,
	OrderStatus
} from './types';
import {
	ItemNotFoundError,
	OrderNotFoundError,
	ItemNotOrderableError,
	InsufficientStockError,
	InsufficientBalanceError,
	NotAuthenticatedError,
	OrderNotUpdatableError,
	NotOrganizerError
} from './types';
import { ShopItem } from './shop-item';
import { Order } from './order';
import type { IAuthProvider } from '$lib/server/auth/types';
import type { IPointsRepo } from '$lib/server/points';

export class ShopService implements IShopService {
	constructor(
		private readonly repository: IShopRepo,
		private readonly authProvider: IAuthProvider,
		private readonly pointsRepo: IPointsRepo
	) {}

	async getAllItems(onlyOrderable: boolean = false): Promise<ShopItem[]> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		const items = await this.repository.getAllItems();
		if (onlyOrderable) {
			return items.filter((item) => item.isOrderable);
		}
		return items;
	}

	async getItemById(id: number): Promise<ShopItem> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		const item = await this.repository.getItemById(id);
		if (!item) {
			throw new ItemNotFoundError(id);
		}
		return item;
	}

	async createItem(data: CreateShopItemData): Promise<ShopItem> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		return await this.repository.createItem(data);
	}

	async updateItem(id: number, data: UpdateShopItemData): Promise<void> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		const item = await this.repository.getItemById(id);
		if (!item) {
			throw new ItemNotFoundError(id);
		}
		await this.repository.updateItem(id, data);
	}

	async deleteItem(id: number): Promise<void> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		const item = await this.repository.getItemById(id);
		if (!item) {
			throw new ItemNotFoundError(id);
		}
		await this.repository.deleteItem(id);
	}

	async purchaseItem(itemId: number): Promise<Order> {
		// Get current user
		const user = await this.authProvider.getCurrentUser();
		if (!user) {
			throw new NotAuthenticatedError();
		}

		// Get item
		const item = await this.getItemById(itemId);

		// Check if item is orderable
		if (!item.isOrderable) {
			throw new ItemNotOrderableError(itemId);
		}

		// Check stock
		if (item.stock <= 0) {
			throw new InsufficientStockError(itemId);
		}

		// Check user balance
		const userBalance = await this.pointsRepo.getTotalPoints(user.id);
		if (userBalance < item.price) {
			throw new InsufficientBalanceError(user.id, item.price, userBalance);
		}

		// Purchase item
		return await this.repository.purchaseItem(user.id, itemId);
	}

	async getOrders(): Promise<Order[]> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		return await this.repository.getOrders();
	}

	async getOrderById(orderId: number): Promise<Order> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		const order = await this.repository.getOrderById(orderId);
		if (!order) {
			throw new OrderNotFoundError(orderId);
		}
		return order;
	}

	async getOrdersByUser(userId: number): Promise<Order[]> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		return await this.repository.getOrdersByUser(userId);
	}

	async updateOrderStatus(orderId: number, status: OrderStatus): Promise<void> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		const order = await this.repository.getOrderById(orderId);
		if (!order) {
			throw new OrderNotFoundError(orderId);
		}
		if (!order.canBeUpdated()) {
			throw new OrderNotUpdatableError(orderId, order.status);
		}
		await this.repository.updateOrderStatus(orderId, status);
	}
}
