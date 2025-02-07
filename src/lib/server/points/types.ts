import type { PointTransactionData } from '../db/types';
import type { PointTransaction } from './transaction';

export interface ReviewTransactionResult {
	success: boolean;
	error?: string;
}

export interface ReviewTransactionOptions {
	transactionId: number;
	reviewerId: number;
	status: 'approved' | 'rejected' | 'deleted';
	rejectionReason?: string;
}

export interface IPointsRepository {
	awardPoints(transaction: PointTransaction): Promise<number>;
	getTotalPoints(userId: number): Promise<number>;
	getTransactions(): Promise<PointTransactionData[]>;
	reviewTransaction(options: ReviewTransactionOptions): Promise<ReviewTransactionResult>;
}
