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
	SessionFilters
} from './types';
import { SessionAlreadyStartedError, SessionNotFoundError } from './types';
import { Session } from './session';
import type { IAuthProvider } from '../auth';

export class ScrapperService implements IScrapperService {
	constructor(
		private readonly repo: IScrapperRepo,
		private readonly authProvider: IAuthProvider
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
		const vote = await this.repo.createVote({
			userId: input.userId,
			scrapId: input.scrapId,
			otherScrapId: input.otherScrapId
		});

		await this.repo.updateScrapPoints(input.scrapId, 2);

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
}
