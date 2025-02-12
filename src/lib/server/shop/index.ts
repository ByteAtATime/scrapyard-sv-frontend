import { PostgresShopRepository } from './postgres';

export * from './types';

export const shopRepository = new PostgresShopRepository();
