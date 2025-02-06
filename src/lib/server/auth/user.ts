import type { IPointsRepository } from '$lib/server/points/types';
import type { IAuthProvider } from './types';

export class User {
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
