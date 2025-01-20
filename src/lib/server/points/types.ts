export interface IPointsRepository {
	getTotalPoints(userId: number): Promise<number>;
}
