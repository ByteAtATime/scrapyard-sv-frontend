import type { IPointsRepository } from '$lib/server/points/types';
import { z } from 'zod';
import type { UserData } from '../db/types';
import type { IAuthProvider } from './types';

export const userJsonSchema = z.object({
	id: z.number(),
	name: z.string(),
	email: z.string(),
	points: z.number(),
	isOrganizer: z.boolean()
});
export type UserJson = z.infer<typeof userJsonSchema>;

export class User {
	constructor(
		private readonly data: UserData,
		private readonly authProvider: IAuthProvider
	) {}

	public get id(): number {
		return this.data.id;
	}

	public get name(): string {
		return this.data.name;
	}

	public get email(): string {
		return this.data.email;
	}

	public get points(): number {
		return this.data.totalPoints;
	}

	public get isOrganizer(): boolean {
		return this.data.isOrganizer;
	}

	public toJson(): UserJson {
		return userJsonSchema.parse({
			id: this.id,
			name: this.name,
			email: this.email,
			points: this.points,
			isOrganizer: this.isOrganizer
		});
	}
}

export class CurrentUser {
	constructor(
		private auth: IAuthProvider,
		private pointsRepository: IPointsRepository
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

		this._totalPoints = await this.pointsRepository.getPoints(id);
		return this._totalPoints;
	}
}
