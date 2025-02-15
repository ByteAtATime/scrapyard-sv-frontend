export * from './types';
export * from './shop-item';
export * from './order';
export * from './service';
export * from './postgres';

import { PostgresShopRepository } from './postgres';
import { ShopService } from './service';

// Create instances
export const shopRepository = new PostgresShopRepository();
export const shopService = new ShopService(shopRepository);
