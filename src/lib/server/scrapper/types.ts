import type { SessionData as DBSessionData } from '../db/types';
import type { sessionStatusEnum } from '../db/schema';

export type SessionStatus = (typeof sessionStatusEnum.enumValues)[number];

// Point System Constants
export const BASE_POINTS_PER_HOUR = 100;
export const POINTS_PER_VOTE = 1;
export const VOTER_POINTS = 1;
export const CREATOR_POINTS_PER_HOUR_PER_VOTE = 1;

// Domain Errors
export class ScrapperError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ScrapperError';
	}
}

export class SessionAlreadyStartedError extends ScrapperError {
	constructor() {
		super('Session already started');
		this.name = 'SessionAlreadyStartedError';
	}
}

export class SessionNotFoundError extends ScrapperError {
	constructor() {
		super('No active session found');
		this.name = 'SessionNotFoundError';
	}
}

export class InvalidSessionStateError extends ScrapperError {
	constructor(currentState: string, expectedState: string) {
		super(`Invalid session state: ${currentState}. Expected: ${expectedState}`);
		this.name = 'InvalidSessionStateError';
	}
}

export class InsufficientSessionDurationError extends ScrapperError {
	constructor(minutes: number, requiredMinutes: number) {
		super(
			`Session duration (${minutes} minutes) is less than required (${requiredMinutes} minutes)`
		);
		this.name = 'InsufficientSessionDurationError';
	}
}

// Domain Types
export interface SessionData {
	id: number;
	userId: number;
	status: SessionStatus;
	startTime: Date;
	lastPausedAt: Date | null;
	totalPausedSeconds: number;
	completedAt: Date | null;
	pointsPerHour: number;
}

export interface ScrapData {
	id: number;
	userId: number;
	sessionId: number;
	title: string;
	description: string;
	attachmentUrls: string[];
	points: number;
	createdAt: Date;
}

export interface CreateScrapInput {
	userId: number;
	sessionId: number;
	title: string;
	description: string;
	attachmentUrls: string[];
	points: number;
}

export interface VoteData {
	id: number;
	userId: number;
	scrapId: number;
	otherScrapId: number;
	points: number;
	createdAt: Date;
	voterTransactionId?: number;
	creatorTransactionId?: number;
}

export interface CreateVoteInput {
	userId: number;
	scrapId: number;
	otherScrapId: number;
	voterTransactionId?: number;
	creatorTransactionId?: number;
}

export interface SessionWithUser extends SessionData {
	userName: string;
	duration: number;
}

export interface ScrapWithUser extends ScrapData {
	userName: string;
}

export interface SessionFilters {
	status?: SessionStatus;
	search?: string;
	page?: number;
	pageSize?: number;
}

export interface VoteWithUser extends VoteData {
	userName: string;
	scrapTitle: string;
	otherScrapTitle: string;
}

export interface VoteFilters {
	userId?: number;
	scrapId?: number;
	startDate?: Date;
	endDate?: Date;
	page?: number;
	pageSize?: number;
}

export interface VoteStats {
	totalVotes: number;
	lastHourVotes: number;
	last24HourVotes: number;
	averageVotesPerUser: number;
	topVoters: { userId: number; userName: string; voteCount: number }[];
}

export interface UserVotingActivity {
	userId: number;
	userName: string;
	totalVotes: number;
	lastVoteTime: Date | null;
}

// Add this interface for the raw vote record from the database
export interface VoteRecord {
	id: number;
	voterId: number;
	scrapId: number;
	otherScrapId: number;
	pointsAwarded: number;
	createdAt: Date;
	voterTransactionId?: number;
	creatorTransactionId?: number;
}

// Repository Interface
export interface IScrapperRepo {
	// Session methods
	getSession(userId: number): Promise<DBSessionData | null>;
	getCurrentSession(userId: number): Promise<DBSessionData | null>;
	createSession(userId: number): Promise<DBSessionData>;
	pauseSession(sessionId: number): Promise<DBSessionData>;
	resumeSession(sessionId: number): Promise<DBSessionData>;
	completeSession(sessionId: number): Promise<DBSessionData>;
	cancelSession(sessionId: number): Promise<DBSessionData>;
	getSessionById(sessionId: number): Promise<DBSessionData | null>;
	updateSession(id: number, data: Partial<DBSessionData>): Promise<DBSessionData>;

	// Scrap methods
	createScrap(
		input: { userId: number; sessionId: number } & Omit<CreateScrapInput, 'userId' | 'sessionId'>
	): Promise<ScrapData>;
	getRandomScrapsForVoting(userId: number, limit: number): Promise<[ScrapData, ScrapData]>;
	createVote(input: {
		userId: number;
		scrapId: number;
		otherScrapId: number;
		voterTransactionId?: number;
		creatorTransactionId?: number;
	}): Promise<VoteData>;
	updateScrapPoints(scrapId: number, points: number): Promise<ScrapData>;
	getScrapById(scrapId: number): Promise<ScrapData | null>;
	getSessionScraps(sessionId: number): Promise<ScrapWithUser[]>;

	// Organizer methods
	getActiveSessionCount(): Promise<number>;
	getScrapCountSince(since: Date): Promise<number>;
	getVoteCountSince(since: Date): Promise<number>;
	getRecentSessions(limit: number): Promise<SessionWithUser[]>;
	getRecentScraps(limit: number): Promise<ScrapWithUser[]>;

	// Session listing methods
	getSessions(filters: SessionFilters): Promise<SessionWithUser[]>;
	getSessionCount(filters: Partial<SessionFilters>): Promise<number>;
	getTotalPointsForSession(sessionId: number): Promise<number>;

	// Vote methods
	getVotes(filters: VoteFilters): Promise<VoteWithUser[]>;
	getVoteCount(filters: Partial<VoteFilters>): Promise<number>;
	getVoteStats(): Promise<VoteStats>;
	getUserVotingActivity(limit?: number): Promise<UserVotingActivity[]>;
	invalidateVote(voteId: number): Promise<void>;

	// Add this method to get a vote record by ID
	getVoteRecord(voteId: number): Promise<VoteRecord | null>;
}

// Service Interface
export interface IScrapperService {
	createSession(userId: number): Promise<SessionData>;
	getSession(userId: number): Promise<SessionData | null>;
	getCurrentSession(userId: number): Promise<SessionData | null>;
	pauseSession(userId: number): Promise<SessionData>;
	resumeSession(userId: number): Promise<SessionData>;
	completeSession(userId: number): Promise<SessionData>;
	cancelSession(userId: number): Promise<SessionData>;
	createScrap(input: CreateScrapInput): Promise<ScrapData>;
	getRandomScrapsForVoting(userId: number): Promise<[ScrapData, ScrapData]>;
	voteOnScrap(input: CreateVoteInput): Promise<VoteData>;
	getSessionScraps(sessionId: number): Promise<ScrapWithUser[]>;

	// Organizer methods
	getActiveSessionCount(): Promise<number>;
	getScrapCountSince(since: Date): Promise<number>;
	getVoteCountSince(since: Date): Promise<number>;
	getRecentSessions(limit: number): Promise<SessionWithUser[]>;
	getRecentScraps(limit: number): Promise<ScrapWithUser[]>;
	getSessionById(sessionId: number): Promise<SessionWithUser | null>;
	getScrapById(scrapId: number): Promise<ScrapWithUser | null>;

	// Session listing methods
	getSessions(filters: SessionFilters): Promise<SessionWithUser[]>;
	getSessionCount(filters: Partial<SessionFilters>): Promise<number>;
	getTotalPointsForSession(sessionId: number): Promise<number>;

	// Vote methods
	getVotes(filters: VoteFilters): Promise<VoteWithUser[]>;
	getVoteCount(filters: Partial<VoteFilters>): Promise<number>;
	getVoteStats(): Promise<VoteStats>;
	getUserVotingActivity(limit?: number): Promise<UserVotingActivity[]>;
	invalidateVote(voteId: number): Promise<void>;
}
