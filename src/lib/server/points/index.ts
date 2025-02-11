import { PostgresPointsRepository } from './postgres';

export const pointsRepository = new PostgresPointsRepository();

export * from './types';
export * from './transaction';
