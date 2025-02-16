import type { PointTransactionData } from '../db/types';
import type { PointTransaction } from './transaction';
import type { transactionStatusEnum } from '../db/schema';

export type TransactionStatus = (typeof transactionStatusEnum.enumValues)[number];

export interface CreateTransactionData {
	userId: number;
	amount: number;
	reason: string;
	authorId: number;
}

export interface ReviewTransactionData {
	reviewerId: number;
	status: TransactionStatus;
	rejectionReason?: string;
}

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

export interface LeaderboardEntry {
	userId: number;
	name: string;
	totalPoints: number;
	transactions: PointTransactionData[];
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
	createTransaction(data: CreateTransactionData): Promise<PointTransactionData>;
	reviewTransaction(
		transactionId: number,
		data: ReviewTransactionData
	): Promise<PointTransactionData>;
	getPendingTransactions(): Promise<PointTransactionData[]>;
	getTransactionById(id: number): Promise<PointTransactionData | null>;
	getPointsStatistics(): Promise<PointsStatistics>;
	getLeaderboard(): Promise<LeaderboardEntry[]>;
}

export interface IPointsService {
	getTotalPoints(userId: number): Promise<number>;
	getTransactions(): Promise<PointTransaction[]>;
	getTransactionsByUser(userId: number): Promise<PointTransaction[]>;
	createTransaction(data: CreateTransactionData): Promise<PointTransactionData>;
	reviewTransaction(
		transactionId: number,
		data: ReviewTransactionData
	): Promise<PointTransactionData>;
	getPendingTransactions(): Promise<PointTransactionData[]>;
	getTransactionById(id: number): Promise<PointTransactionData | null>;
}
