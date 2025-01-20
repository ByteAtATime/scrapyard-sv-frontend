import { z } from 'zod';
import type { PointTransactionData } from '$lib/server/db/types';

export const pointTransactionJsonSchema = z.object({
	id: z.number(),
	userId: z.number(),
	reason: z.string(),
	authorId: z.number(),
	amount: z.number(),
	createdAt: z.coerce.date()
});
export type PointTransactionJson = z.infer<typeof pointTransactionJsonSchema>;

export class PointTransaction {
	constructor(private readonly data: PointTransactionData) {}

	public get id(): number {
		return this.data.id;
	}

	public get userId(): number {
		return this.data.userId;
	}

	public get authorId(): number {
		return this.data.authorId;
	}

	public get amount(): number {
		return this.data.amount;
	}

	public get reason(): string {
		return this.data.reason;
	}

	public get createdAt(): Date {
		return new Date(this.data.createdAt);
	}

	public toJson(): PointTransactionJson {
		return pointTransactionJsonSchema.parse(this.data);
	}
}
