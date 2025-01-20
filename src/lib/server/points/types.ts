import type { PointTransaction } from './transaction';

export interface IPointsRepository {
	getTotalPoints(userId: number): Promise<number>;

	/**
	 * Award points to a user
	 * @param transaction - The transaction to award points for. The `userId` is the user to award points to. `id` and `createdAt` are ignored.
	 * @returns The ID of the transaction
	 */
	awardPoints(transaction: PointTransaction): Promise<number>;
}
