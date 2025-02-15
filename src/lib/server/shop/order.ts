import { z } from 'zod';
import type { OrderData } from './types';

export const orderJsonSchema = z.object({
	id: z.number(),
	userId: z.number(),
	shopItemId: z.number(),
	status: z.enum(['pending', 'fulfilled', 'cancelled']),
	createdAt: z.date()
});

export class Order {
	constructor(private readonly data: OrderData) {}

	public get id(): number {
		return this.data.id;
	}

	public get userId(): number {
		return this.data.userId;
	}

	public get shopItemId(): number {
		return this.data.shopItemId;
	}

	public get status(): 'pending' | 'fulfilled' | 'cancelled' {
		return this.data.status;
	}

	public get createdAt(): Date {
		return this.data.createdAt;
	}

	public canBeUpdated(): boolean {
		return this.status === 'pending';
	}

	public toJson(): z.infer<typeof orderJsonSchema> {
		return {
			id: this.id,
			userId: this.userId,
			shopItemId: this.shopItemId,
			status: this.status,
			createdAt: this.createdAt
		};
	}
}
