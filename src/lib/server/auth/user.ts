import type { IPointsRepo } from '$lib/server/points/types';
import { z } from 'zod';
import type { UserData } from '../db/types';
import type { IAuthProvider } from './types';

export const userJsonSchema = z.object({
	id: z.number(),
	name: z.string(),
	email: z.string(),
	totalPoints: z.coerce.number(),
	isOrganizer: z.boolean(),
	avatarUrl: z.string().nullable()
});
export type UserJson = z.infer<typeof userJsonSchema>;

export interface IUserWithPoints extends UserData {
	totalPoints: number;
}

export class User {
	private readonly _data: UserData;
	private _totalPoints: number | null;

	constructor(data: UserData, totalPoints?: number) {
		this._data = data;
		this._totalPoints = totalPoints ?? null;
	}

	public get id(): number {
		return this._data.id;
	}

	public get name(): string {
		return this._data.name;
	}

	public get email(): string {
		return this._data.email;
	}

	public get totalPoints(): number {
		// If points weren't provided, default to 0
		return this._totalPoints ?? 0;
	}

	public get isOrganizer(): boolean {
		return this._data.isOrganizer;
	}

	public get avatarUrl(): string | null {
		return this._data.avatarUrl || null;
	}

	public toJson(): UserJson {
		return {
			id: this.id,
			name: this.name,
			email: this.email,
			totalPoints: this.totalPoints,
			isOrganizer: this.isOrganizer,
			avatarUrl: this.avatarUrl
		};
	}

	public static fromUserData(userData: UserData, totalPoints: number): User {
		return new User(userData, totalPoints);
	}

	public withPoints(points: number): User {
		return new User(this._data, points);
	}
}

export class CurrentUser {
	constructor(
		private auth: IAuthProvider,
		private pointsRepo: IPointsRepo
	) {}

	private _id: number | null = null;
	private _isOrganizer: boolean | null = null;
	private _totalPoints: number | null = null;

	async getUserId() {
		if (this._id) {
			return this._id;
		}

		this._id = await this.auth.getUserId();
		return this._id;
	}

	async getIsOrganizer() {
		if (this._isOrganizer) {
			return this._isOrganizer;
		}

		this._isOrganizer = await this.auth.isOrganizer();
		return this._isOrganizer;
	}

	async getTotalPoints() {
		if (this._totalPoints) {
			return this._totalPoints;
		}

		const id = await this.getUserId();

		if (!id) {
			throw new Error('User not authenticated');
		}

		this._totalPoints = await this.pointsRepo.getTotalPoints(id);
		return this._totalPoints;
	}
}
