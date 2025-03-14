import type {
	IScrapperService,
	IScrapperRepo,
	SessionData,
	CreateScrapInput,
	ScrapData,
	CreateVoteInput,
	VoteData,
	SessionWithUser,
	ScrapWithUser,
	SessionFilters,
	VoteFilters,
	VoteWithUser,
	VoteStats,
	UserVotingActivity
} from './types';
import {
	CREATOR_POINTS_PER_HOUR_PER_VOTE,
	SessionAlreadyStartedError,
	SessionNotFoundError
} from './types';
import { Session, VOTER_POINTS_PER_VOTE } from './session';
import type { IAuthProvider } from '../auth';
import type { IPointsService } from '../points';

export class ScrapperService implements IScrapperService {
	constructor(
		private readonly repo: IScrapperRepo,
		private readonly authProvider: IAuthProvider,
		private readonly pointsService: IPointsService
	) {}

	async createSession(userId: number): Promise<SessionData> {
		const existingSession = await this.getCurrentSession(userId);
		if (
			existingSession &&
			existingSession.status !== 'completed' &&
			existingSession.status !== 'cancelled'
		) {
			throw new SessionAlreadyStartedError();
		}

		const dbSession = await this.repo.createSession(userId);
		return Session.fromDB(dbSession, this.authProvider).toJson();
	}

	async getSession(userId: number): Promise<SessionData | null> {
		const dbSession = await this.repo.getSession(userId);
		if (!dbSession) return null;
		return Session.fromDB(dbSession, this.authProvider).toJson();
	}

	async getCurrentSession(userId: number): Promise<SessionData | null> {
		const dbSession = await this.repo.getCurrentSession(userId);
		if (!dbSession) return null;
		return Session.fromDB(dbSession, this.authProvider).toJson();
	}

	async pauseSession(userId: number): Promise<SessionData> {
		const session = await this.getCurrentSession(userId);
		if (!session) throw new SessionNotFoundError();
		if (session.status !== 'active') throw new Error('Session is not active');

		const dbSession = await this.repo.updateSession(session.id, {
			status: 'paused',
			lastPausedAt: new Date()
		});

		return Session.fromDB(dbSession, this.authProvider).toJson();
	}

	async resumeSession(userId: number): Promise<SessionData> {
		const session = await this.getCurrentSession(userId);
		if (!session) throw new SessionNotFoundError();
		if (session.status !== 'paused') throw new Error('Session is not paused');

		const lastPausedAt = session.lastPausedAt;
		if (!lastPausedAt) throw new Error('Session has no pause time');

		const pausedSeconds = Math.floor((Date.now() - lastPausedAt.getTime()) / 1000);
		const totalPausedSeconds = (session.totalPausedSeconds || 0) + pausedSeconds;

		const dbSession = await this.repo.updateSession(session.id, {
			status: 'active',
			lastPausedAt: null,
			totalPausedTime: (totalPausedSeconds / 60).toString()
		});

		return Session.fromDB(dbSession, this.authProvider).toJson();
	}

	async completeSession(userId: number): Promise<SessionData> {
		const session = await this.getCurrentSession(userId);
		if (!session) throw new SessionNotFoundError();
		if (session.status !== 'active' && session.status !== 'paused')
			throw new Error('Session must be active or paused to complete');

		const dbSession = await this.repo.completeSession(session.id);

		return Session.fromDB(dbSession, this.authProvider).toJson();
	}

	async cancelSession(userId: number): Promise<SessionData> {
		const session = await this.getCurrentSession(userId);
		if (!session) throw new SessionNotFoundError();
		if (session.status === 'completed' || session.status === 'cancelled')
			throw new Error('Session is already completed or cancelled');

		const dbSession = await this.repo.cancelSession(session.id);

		return Session.fromDB(dbSession, this.authProvider).toJson();
	}

	async createScrap(input: CreateScrapInput): Promise<ScrapData> {
		return this.repo.createScrap({
			...input,
			userId: input.userId,
			sessionId: input.sessionId
		});
	}

	async getRandomScrapsForVoting(userId: number): Promise<[ScrapData, ScrapData]> {
		return this.repo.getRandomScrapsForVoting(userId, 2);
	}

	async voteOnScrap(input: CreateVoteInput): Promise<VoteData> {
		// 1. Get the scrap and session information (using the repository)
		const scrap = await this.repo.getScrapById(input.scrapId);
		if (!scrap) {
			throw new Error('Scrap not found');
		}
		const session = await this.repo.getSessionById(scrap.sessionId);
		if (!session) {
			throw new Error('Session not found');
		}

		// 2. Calculate points (business logic - could be in a domain object)
		const sessionObj = Session.fromDB(session, this.authProvider);
		const durationHours = sessionObj.getSessionDurationMinutes() / 60;
		const voterPoints = VOTER_POINTS_PER_VOTE;
		const creatorPoints = Math.floor(durationHours * CREATOR_POINTS_PER_HOUR_PER_VOTE);

		// 3. Award points to the voter (using the PointsService)
		const voterTransaction = await this.pointsService.createTransaction({
			userId: input.userId,
			amount: voterPoints,
			reason: `Voted on scrap #${input.scrapId}`,
			authorId: input.userId
		});

		// 4. Award points to the scrap creator (using the PointsService)
		const creatorTransaction = await this.pointsService.createTransaction({
			userId: scrap.userId,
			amount: creatorPoints,
			reason: `Received vote on scrap #${input.scrapId} (${Math.floor(durationHours)} hours)`,
			authorId: input.userId
		});

		// 5. Create the vote with transaction IDs (using the repository)
		const vote = await this.repo.createVote({
			userId: input.userId,
			scrapId: input.scrapId,
			otherScrapId: input.otherScrapId,
			voterTransactionId: voterTransaction.id,
			creatorTransactionId: creatorTransaction.id
		});

		return vote;
	}

	// Organizer methods
	async getActiveSessionCount(): Promise<number> {
		return this.repo.getActiveSessionCount();
	}

	async getScrapCountSince(since: Date): Promise<number> {
		return this.repo.getScrapCountSince(since);
	}

	async getVoteCountSince(since: Date): Promise<number> {
		return this.repo.getVoteCountSince(since);
	}

	async getRecentSessions(limit: number): Promise<SessionWithUser[]> {
		return this.repo.getRecentSessions(limit);
	}

	async getRecentScraps(limit: number): Promise<ScrapWithUser[]> {
		return this.repo.getRecentScraps(limit);
	}

	async getSessionById(sessionId: number): Promise<SessionWithUser | null> {
		const session = await this.repo.getSessionById(sessionId);
		if (!session) {
			return null;
		}
		const user = await this.authProvider.getUserById(session.userId);
		if (!user) {
			return null;
		}

		const now = new Date();
		const startTime = new Date(session.startTime);
		const lastPausedAt = session.lastPausedAt ? new Date(session.lastPausedAt) : null;
		const totalPausedSeconds = session.totalPausedSeconds || 0;

		// Calculate duration in minutes
		let duration = 0;
		if (session.status === 'active') {
			duration = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
		} else if (session.status === 'paused' && lastPausedAt) {
			duration = Math.floor((lastPausedAt.getTime() - startTime.getTime()) / (1000 * 60));
		} else if (session.status === 'completed' && session.endTime) {
			duration = Math.floor(
				(new Date(session.endTime).getTime() - startTime.getTime()) / (1000 * 60)
			);
		}

		// Subtract paused time from duration
		duration -= Math.floor(totalPausedSeconds / 60);

		return {
			...session,
			userName: user.name,
			duration,
			totalPausedSeconds: totalPausedSeconds || 0,
			completedAt: session.endTime,
			pointsPerHour: 60 // Fixed value as per requirements
		};
	}

	async getScrapById(scrapId: number): Promise<ScrapWithUser | null> {
		const scrap = await this.repo.getScrapById(scrapId);
		if (!scrap) {
			return null;
		}
		const user = await this.authProvider.getUserById(scrap.userId);
		if (!user) {
			return null;
		}
		return {
			...scrap,
			userName: user.name
		};
	}

	// Session listing methods
	async getSessions(filters: SessionFilters): Promise<SessionWithUser[]> {
		return this.repo.getSessions(filters);
	}

	async getSessionCount(filters: Partial<SessionFilters>): Promise<number> {
		return this.repo.getSessionCount(filters);
	}

	async getTotalPointsForSession(sessionId: number): Promise<number> {
		return this.repo.getTotalPointsForSession(sessionId);
	}

	async getSessionScraps(sessionId: number): Promise<ScrapWithUser[]> {
		return this.repo.getSessionScraps(sessionId);
	}

	// Vote methods
	async getVotes(filters: VoteFilters): Promise<VoteWithUser[]> {
		return this.repo.getVotes(filters);
	}

	async getVoteCount(filters: Partial<VoteFilters>): Promise<number> {
		return this.repo.getVoteCount(filters);
	}

	async getVoteStats(): Promise<VoteStats> {
		return this.repo.getVoteStats();
	}

	async getUserVotingActivity(limit?: number): Promise<UserVotingActivity[]> {
		return this.repo.getUserVotingActivity(limit);
	}

	async getUserVotesInLastHour(userId: number): Promise<number> {
		return this.repo.getUserVotesInLastHour(userId);
	}

	async getOldestVoteTimeInLastHour(userId: number): Promise<Date | null> {
		return this.repo.getOldestVoteTimeInLastHour(userId);
	}

	async invalidateVote(voteId: number): Promise<void> {
		// Get the vote record to find associated transactions
		const voteRecord = await this.repo.getVoteRecord(voteId);
		if (!voteRecord) {
			throw new Error(`Vote with ID ${voteId} not found`);
		}

		// Delete associated transactions if they exist
		try {
			if (voteRecord.voterTransactionId) {
				await this.pointsService.reviewTransaction(voteRecord.voterTransactionId, {
					reviewerId: (await this.authProvider.getUserId()) || 0,
					status: 'deleted'
				});
			}

			if (voteRecord.creatorTransactionId) {
				await this.pointsService.reviewTransaction(voteRecord.creatorTransactionId, {
					reviewerId: (await this.authProvider.getUserId()) || 0,
					status: 'deleted'
				});
			}
		} catch (error) {
			console.error('Error deleting transactions:', error);
		}

		// Delete the vote through the repository
		await this.repo.invalidateVote(voteId);
	}
}
