import { z } from 'zod';

export const shopItemSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().min(1, 'Description is required'),
	imageUrl: z.string().url('Must be a valid URL'),
	price: z.number().int().positive('Price must be a positive number'),
	stock: z.number().int().min(0, 'Stock cannot be negative'),
	isOrderable: z.boolean()
});

export const editShopItemSchema = shopItemSchema.extend({
	id: z.number().int().nonnegative()
});

export const deleteShopItemSchema = z.object({
	id: z.number().int().nonnegative()
});
