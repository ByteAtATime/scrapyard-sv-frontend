import type {
	IPointsService,
	IPointsRepo,
	CreateTransactionData,
	ReviewTransactionData
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
			throw new Error('Transaction not found');
		}

		// Check if the reviewer is trying to approve their own transaction
		if (transaction.userId === data.reviewerId) {
			throw new Error('Cannot approve your own transaction');
		}

		return await this.repository.reviewTransaction(transactionId, data);
	}

	async getPendingTransactions(): Promise<PointTransactionData[]> {
		return await this.repository.getPendingTransactions();
	}

	async getTransactionById(id: number): Promise<PointTransactionData | null> {
		return await this.repository.getTransactionById(id);
	}
}
