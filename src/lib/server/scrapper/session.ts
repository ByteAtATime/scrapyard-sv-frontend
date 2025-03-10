import { z } from 'zod';
import { selectUserSchema } from '../db/types';
import type { IAuthProvider } from '../auth';
import type { SessionStatus, SessionData } from './types';
import type { SessionData as DBSessionData } from '../db/types';

export const sessionJsonSchema = z.object({
	id: z.number(),
	userId: z.number(),
	status: z.string(),
	startTime: z.coerce.date(),
	endTime: z.coerce.date().nullable(),
	totalPausedTime: z.string(),
	totalPausedSeconds: z.number(),
	lastPausedAt: z.coerce.date().nullable(),
	user: selectUserSchema
});
export type SessionJson = z.infer<typeof sessionJsonSchema>;

// Minimum session duration in minutes to create a scrap
export const MIN_SESSION_DURATION_MINUTES = 60;

// Points awarded per hour of session time
export const BASE_POINTS_PER_HOUR = 5;

// Points awarded to voter per vote
export const VOTER_POINTS_PER_VOTE = 1;

// Additional points per hour that a scrap creator earns when someone votes for their scrap
export const CREATOR_POINTS_PER_HOUR_PER_VOTE = 2;

// Maximum votes a user can cast per hour
export const MAX_VOTES_PER_HOUR = 5;

export class Session {
	constructor(
		private readonly data: {
			id: number;
			userId: number;
			status: SessionStatus;
			startTime: Date;
			lastPausedAt: Date | null;
			totalPausedSeconds: number;
			completedAt: Date | null;
			pointsPerHour: number;
			createdAt?: Date;
			updatedAt?: Date;
		},
		private readonly authProvider: IAuthProvider
	) {}

	public get id() {
		return this.data.id;
	}

	public get userId() {
		return this.data.userId;
	}

	public get status(): SessionStatus {
		return this.data.status;
	}

	public get startTime() {
		return this.data.startTime;
	}

	public get endTime() {
		return this.data.completedAt;
	}

	public get totalPausedSeconds() {
		return this.data.totalPausedSeconds;
	}

	public get lastPausedAt() {
		return this.data.lastPausedAt;
	}

	public get createdAt() {
		return this.data.createdAt;
	}

	public get updatedAt() {
		return this.data.updatedAt;
	}

	/**
	 * Get the effective session duration in minutes, accounting for pauses
	 */
	public getSessionDurationMinutes(): number {
		if (!this.data.completedAt) {
			// Session is still active or paused
			const endTime =
				this.status === 'paused' && this.data.lastPausedAt ? this.data.lastPausedAt : new Date();

			const durationMs = endTime.getTime() - this.data.startTime.getTime();
			const pausedMs = this.data.totalPausedSeconds * 1000;

			return Math.floor((durationMs - pausedMs) / (1000 * 60));
		}

		// Session is completed or cancelled
		const durationMs = this.data.completedAt.getTime() - this.data.startTime.getTime();
		const pausedMs = this.data.totalPausedSeconds * 1000;

		return Math.floor((durationMs - pausedMs) / (1000 * 60));
	}

	/**
	 * Calculate base points for this session based on its duration
	 */
	public calculateBasePoints(): number {
		const durationHours = this.getSessionDurationMinutes() / 60;
		return Math.floor(durationHours * BASE_POINTS_PER_HOUR);
	}

	/**
	 * Check if the session meets the minimum duration requirement
	 */
	public meetsMinimumDuration(): boolean {
		return this.getSessionDurationMinutes() >= MIN_SESSION_DURATION_MINUTES;
	}

	toJson(): SessionData {
		return {
			id: this.data.id,
			userId: this.data.userId,
			status: this.data.status,
			startTime: this.data.startTime,
			lastPausedAt: this.data.lastPausedAt,
			totalPausedSeconds: this.data.totalPausedSeconds,
			completedAt: this.data.completedAt,
			pointsPerHour: this.data.pointsPerHour
		};
	}

	static fromDB(dbData: DBSessionData, authProvider: IAuthProvider): Session {
		return new Session(
			{
				id: dbData.id,
				userId: dbData.userId,
				status: dbData.status,
				startTime: dbData.startTime,
				lastPausedAt: dbData.lastPausedAt,
				totalPausedSeconds: dbData.totalPausedSeconds || 0,
				completedAt: dbData.endTime,
				pointsPerHour: BASE_POINTS_PER_HOUR,
				createdAt: dbData.createdAt,
				updatedAt: dbData.updatedAt
			},
			authProvider
		);
	}
}
