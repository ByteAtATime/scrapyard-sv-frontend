import { z } from 'zod';
import type { ShopItemData } from './types';

export const shopItemJsonSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	imageUrl: z.string(),
	price: z.number(),
	stock: z.number(),
	isOrderable: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date()
});

export type ShopItemJson = z.infer<typeof shopItemJsonSchema>;

export class ShopItem {
	constructor(private readonly data: ShopItemData) {}

	public get id(): number {
		return this.data.id;
	}

	public get name(): string {
		return this.data.name;
	}

	public get description(): string {
		return this.data.description;
	}

	public get imageUrl(): string {
		return this.data.imageUrl;
	}

	public get price(): number {
		return this.data.price;
	}

	public get stock(): number {
		return this.data.stock;
	}

	public get isOrderable(): boolean {
		return this.data.isOrderable;
	}

	public get createdAt(): Date {
		return this.data.createdAt;
	}

	public get updatedAt(): Date {
		return this.data.updatedAt;
	}

	public canBePurchased(): boolean {
		return this.isOrderable && this.stock > 0;
	}

	public toJson(): ShopItemJson {
		return shopItemJsonSchema.parse({
			id: this.id,
			name: this.name,
			description: this.description,
			imageUrl: this.imageUrl,
			price: this.price,
			stock: this.stock,
			isOrderable: this.isOrderable,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		});
	}
}
