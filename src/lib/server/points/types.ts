import type { PointTransactionData } from '../db/types';
import type { PointTransaction } from './transaction';
import type { transactionStatusEnum } from '../db/schema';

export type TransactionStatus = (typeof transactionStatusEnum.enumValues)[number];

// Domain Errors
export class PointsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PointsError';
	}
}

export class NotAuthenticatedError extends PointsError {
	constructor() {
		super('User is not authenticated');
		this.name = 'NotAuthenticatedError';
	}
}

export class NotOrganizerError extends PointsError {
	constructor() {
		super('User is not an organizer');
		this.name = 'NotOrganizerError';
	}
}

export class UserNotFoundError extends PointsError {
	constructor(userId: number) {
		super(`User with ID ${userId} not found`);
		this.name = 'UserNotFoundError';
	}
}

export class TransactionNotFoundError extends PointsError {
	constructor(transactionId: number) {
		super(`Transaction with ID ${transactionId} not found`);
		this.name = 'TransactionNotFoundError';
	}
}

export class SelfReviewError extends PointsError {
	constructor(userId: number) {
		super(`User ${userId} cannot review their own transaction`);
		this.name = 'SelfReviewError';
	}
}

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
	getUserRank(userId: number): Promise<{ rank: number; totalUsers: number }>;
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
	awardPoints(userId: number, amount: number, reason: string): Promise<void>;
}
