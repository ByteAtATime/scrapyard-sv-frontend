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

export interface TopPointEarner {
	userId: number;
	name: string;
	totalPoints: number;
}

export interface PointsStatistics {
	totalPointsAwarded: number;
	averagePointsPerAttendee: number;
	topEarner: TopPointEarner;
}

export interface IPointsRepo {
	awardPoints(transaction: PointTransaction): Promise<number>;
	getTotalPoints(userId: number): Promise<number>;
	getTransactions(): Promise<PointTransactionData[]>;
	getTransactionsByUser(userId: number): Promise<PointTransactionData[]>;
	reviewTransaction(options: ReviewTransactionOptions): Promise<ReviewTransactionResult>;
	getPointsStatistics(): Promise<PointsStatistics>;
}
