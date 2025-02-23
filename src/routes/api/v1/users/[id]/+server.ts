import { compose, withRouteParams } from '$lib/server/endpoints';
import { withUserService, withAuthProvider } from '$lib/server/endpoints/dependencies';
import { endpoint_GET, routeSchema } from './endpoint';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = compose(
	withAuthProvider(),
	withUserService(),
	withRouteParams(routeSchema)
)(endpoint_GET);
