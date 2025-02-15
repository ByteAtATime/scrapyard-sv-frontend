import { PostgresPointsRepo } from './postgres';

// Create instances
export const pointsRepo = new PostgresPointsRepo();

export * from './types';
export * from './transaction';
export * from './postgres';
export * from './service';
