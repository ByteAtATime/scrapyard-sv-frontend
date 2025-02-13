export * from './types';
export * from './postgres';
export * from './service';

import { PostgresShopRepository } from './postgres';
import { ShopService } from './service';

// Create instances
export const shopRepository = new PostgresShopRepository();
export const shopService = new ShopService(shopRepository);
