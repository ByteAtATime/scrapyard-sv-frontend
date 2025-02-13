import { ClerkAuthProvider } from '../auth/clerk';
import type { IAuthProvider } from '../auth/types';
import { PostgresEventsRepo } from '../events/postgres';
import type { IEventsRepo } from '../events/types';
import { PostgresPointsRepo } from '../points/postgres';
import type { IPointsRepo } from '../points/types';
import type { MiddlewareHandler } from './types';

export const withAuthProvider = <
	TDeps extends { authProvider: IAuthProvider }
>(): MiddlewareHandler<Omit<TDeps, 'authProvider'>> => {
	return async (deps, event, next) => {
		const authProvider = new ClerkAuthProvider(event.locals.auth);
		return next({ ...deps, authProvider } as unknown as TDeps);
	};
};

export const withPointsRepo = <TDeps extends { pointsRepo: IPointsRepo }>(): MiddlewareHandler<
	Omit<TDeps, 'pointsRepo'>
> => {
	return async (deps, event, next) => {
		const pointsRepo = new PostgresPointsRepo();
		return next({ ...deps, pointsRepo } as unknown as TDeps);
	};
};

export const withEventsRepo = <TDeps extends { eventsRepo: IEventsRepo }>(): MiddlewareHandler<
	Omit<TDeps, 'eventsRepo'>
> => {
	return async (deps, event, next) => {
		const eventsRepo = new PostgresEventsRepo();
		return next({ ...deps, eventsRepo } as unknown as TDeps);
	};
};
