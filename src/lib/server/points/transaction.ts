import { z } from 'zod';
import type { PointTransactionData } from '$lib/server/db/types';
import type { IAuthProvider } from '../auth/types';

export const pointTransactionJsonSchema = z.object({
	id: z.number(),
	userId: z.number(),
	amount: z.number(),
	reason: z.string(),
	authorId: z.number(),
	createdAt: z.coerce.date(),
	status: z.enum(['pending', 'approved', 'rejected', 'deleted']),
	reviewerId: z.number().nullable().default(null),
	reviewedAt: z.coerce.date().nullable().default(null),
	rejectionReason: z.string().nullable().default(null),
	user: z.object({
		id: z.number(),
		name: z.string(),
		email: z.string()
	}),
	author: z.object({
		id: z.number(),
		name: z.string(),
		email: z.string()
	}),
	reviewer: z
		.object({
			id: z.number(),
			name: z.string(),
			email: z.string()
		})
		.nullable()
		.default(null)
});
export type PointTransactionJson = z.infer<typeof pointTransactionJsonSchema>;

export class PointTransaction {
	constructor(
		private readonly data: PointTransactionData,
		private readonly authProvider: IAuthProvider
	) {}

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
		const user = this.authProvider.getUserById(this.userId);
		const author = this.authProvider.getUserById(this.authorId);
		const reviewer = this.data.reviewerId
			? this.authProvider.getUserById(this.data.reviewerId)
			: null;

		return pointTransactionJsonSchema.parse({
			...this.data,
			user,
			author,
			reviewer
		});
	}
}
