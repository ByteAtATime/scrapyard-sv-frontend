import type {
	IPointsService,
	IPointsRepo,
	CreateTransactionData,
	ReviewTransactionData,
	LeaderboardEntry
} from './types';
import {
	NotAuthenticatedError,
	NotOrganizerError,
	UserNotFoundError,
	TransactionNotFoundError,
	SelfReviewError
} from './types';
import type { PointTransactionData } from '../db/types';
import { PointTransaction } from './transaction';
import type { IAuthProvider } from '$lib/server/auth/types';

export class PointsService implements IPointsService {
	constructor(
		private readonly repository: IPointsRepo,
		private readonly authProvider: IAuthProvider
	) {}

	async getTotalPoints(userId: number): Promise<number> {
		return await this.repository.getTotalPoints(userId);
	}

	async getTransactions(): Promise<PointTransaction[]> {
		const transactions = await this.repository.getTransactions();
		return transactions.map((transaction) => new PointTransaction(transaction, this.authProvider));
	}

	async getTransactionsByUser(userId: number): Promise<PointTransaction[]> {
		const transactions = await this.repository.getTransactionsByUser(userId);
		return transactions.map((transaction) => new PointTransaction(transaction, this.authProvider));
	}

	async createTransaction(data: CreateTransactionData): Promise<PointTransactionData> {
		return await this.repository.createTransaction(data);
	}

	async reviewTransaction(
		transactionId: number,
		data: ReviewTransactionData
	): Promise<PointTransactionData> {
		// First, get the transaction to check its user
		const transaction = await this.repository.getTransactionById(transactionId);

		// If transaction doesn't exist, throw an error
		if (!transaction) {
			throw new TransactionNotFoundError(transactionId);
		}

		// Check if the reviewer is trying to approve their own transaction
		if (transaction.userId === data.reviewerId) {
			throw new SelfReviewError(data.reviewerId);
		}

		return await this.repository.reviewTransaction(transactionId, data);
	}

	async getPendingTransactions(): Promise<PointTransactionData[]> {
		return await this.repository.getPendingTransactions();
	}

	async getTransactionById(id: number): Promise<PointTransactionData | null> {
		return await this.repository.getTransactionById(id);
	}

	async awardPoints(userId: number, amount: number, reason: string): Promise<void> {
		// Authorization check
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		// User existence check
		const user = await this.authProvider.getUserById(userId);
		if (!user) {
			throw new UserNotFoundError(userId);
		}

		// Create and save transaction
		const transaction = new PointTransaction(
			{
				userId,
				amount,
				reason,
				authorId,
				id: 0,
				createdAt: new Date(),
				status: 'pending',
				reviewerId: null,
				reviewedAt: null,
				rejectionReason: null
			},
			this.authProvider
		);

		await this.repository.awardPoints(transaction);
	}

	async getLeaderboard(): Promise<LeaderboardEntry[]> {
		if (!(await this.authProvider.isOrganizer())) {
			throw new NotOrganizerError();
		}

		const authorId = await this.authProvider.getUserId();
		if (!authorId) {
			throw new NotAuthenticatedError();
		}

		return await this.repository.getLeaderboard();
	}
}
