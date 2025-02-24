import { ClerkAuthProvider } from '../auth/clerk';
import type { IAuthProvider } from '../auth/types';
import { PostgresEventsRepo } from '../events/postgres';
import { PostgresPointsRepo } from '../points/postgres';
import { ShopService } from '../shop/service';
import { PostgresShopRepo } from '../shop';
import type { IShopService } from '../shop/types';
import type { MiddlewareHandler } from './types';
import { PointsService } from '../points';
import { EventsService } from '$lib/server/events/service';
import { UserService } from '../auth/service';

export const withAuthProvider = <
	TDeps extends { authProvider: IAuthProvider }
>(): MiddlewareHandler<Omit<TDeps, 'authProvider'>> => {
	return async (deps, event, next) => {
		const authProvider = new ClerkAuthProvider(event.locals.auth);
		return next({ ...deps, authProvider } as unknown as TDeps);
	};
};

export const withShopService = <TDeps extends { shopService: IShopService }>(): MiddlewareHandler<
	Omit<TDeps, 'shopService'>
> => {
	return async (deps, event, next) => {
		const authProvider = new ClerkAuthProvider(event.locals.auth);
		const shopService = new ShopService(
			new PostgresShopRepo(),
			authProvider,
			new PostgresPointsRepo()
		);
		return next({ ...deps, shopService } as unknown as TDeps);
	};
};

export const withPointsService = <
	TDeps extends { pointsService: PointsService }
>(): MiddlewareHandler<Omit<TDeps, 'pointsService'>> => {
	return async (deps, event, next) => {
		const pointsService = new PointsService(
			new PostgresPointsRepo(),
			new ClerkAuthProvider(event.locals.auth)
		);
		return next({ ...deps, pointsService } as unknown as TDeps);
	};
};

export const withUserService = <TDeps extends { userService: UserService }>(): MiddlewareHandler<
	Omit<TDeps, 'userService'>
> => {
	return async (deps, event, next) => {
		const userService = new UserService(new ClerkAuthProvider(event.locals.auth));
		return next({ ...deps, userService } as unknown as TDeps);
	};
};

export const withDependencies = <T extends Record<string, unknown>>(
	factory: (deps: { authProvider: IAuthProvider }) => Promise<T>
): MiddlewareHandler<Record<string, unknown>> => {
	return async (deps, event, next) => {
		const authProvider = new ClerkAuthProvider(event.locals.auth);
		const newDeps = await factory({ authProvider });
		return next({ ...deps, ...newDeps });
	};
};

export type EventsServiceDep = { eventsService: EventsService };

export const withEventsService = () => {
	return withDependencies<{ eventsService: EventsService }>(async ({ authProvider }) => {
		return {
			eventsService: new EventsService(new PostgresEventsRepo(), authProvider)
		};
	});
};
