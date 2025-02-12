import { ClerkAuthProvider } from '../auth/clerk';
import type { IAuthProvider } from '../auth/types';
import { PostgresEventsRepository } from '../events/postgres';
import type { IEventsRepository } from '../events/types';
import { PostgresPointsRepository } from '../points/postgres';
import type { IPointsRepository } from '../points/types';
import type { IShopRepository } from '../shop';
import { PostgresShopRepository } from '../shop/postgres';
import type { MiddlewareHandler } from './types';

export const withAuthProvider = <
	TDeps extends { authProvider: IAuthProvider }
>(): MiddlewareHandler<Omit<TDeps, 'authProvider'>> => {
	return async (deps, event, next) => {
		const authProvider = new ClerkAuthProvider(event.locals.auth);
		return next({ ...deps, authProvider } as unknown as TDeps);
	};
};

export const withPointsRepository = <
	TDeps extends { pointsRepository: IPointsRepository }
>(): MiddlewareHandler<Omit<TDeps, 'pointsRepository'>> => {
	return async (deps, event, next) => {
		const pointsRepository = new PostgresPointsRepository();
		return next({ ...deps, pointsRepository } as unknown as TDeps);
	};
};

export const withEventsRepository = <
	TDeps extends { eventsRepository: IEventsRepository }
>(): MiddlewareHandler<Omit<TDeps, 'eventsRepository'>> => {
	return async (deps, event, next) => {
		const eventsRepository = new PostgresEventsRepository();
		return next({ ...deps, eventsRepository } as unknown as TDeps);
	};
};

export const withShopRepository = <
	TDeps extends { shopRepository: IShopRepository }
>(): MiddlewareHandler<Omit<TDeps, 'shopRepository'>> => {
	return async (deps, event, next) => {
		const shopRepository = new PostgresShopRepository();
		return next({ ...deps, shopRepository } as unknown as TDeps);
	};
};
