import { ClerkAuthProvider } from '../auth/clerk';
import type { IAuthProvider } from '../auth/types';
import { PostgresPointsRepository } from '../points/postgres';
import type { IPointsRepository } from '../points/types';
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
