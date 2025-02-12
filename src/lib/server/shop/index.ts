import { PostgresShopRepo } from './postgres';

export * from './types';

export const shopRepo = new PostgresShopRepo();
