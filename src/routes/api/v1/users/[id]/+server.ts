import { compose, withRouteParams } from '$lib/server/endpoints';
import {
	withUserService,
	withAuthProvider,
	withPointsService
} from '$lib/server/endpoints/dependencies';
import { endpoint_GET, routeSchema } from './endpoint';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = compose(
	withAuthProvider(),
	withUserService(),
	withPointsService(),
	withRouteParams(routeSchema)
)(endpoint_GET);
