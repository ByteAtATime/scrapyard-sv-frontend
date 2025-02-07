import { compose } from '$lib/server/endpoints';
import { withAuthProvider } from '$lib/server/endpoints/dependencies';
import { withRouteParams } from '$lib/server/endpoints/validation';
import { endpoint_GET } from './endpoint';
import type { RequestHandler, RouteParams } from './$types';

export const GET: RequestHandler = compose(
	withAuthProvider(),
	withRouteParams<RouteParams>()
)(endpoint_GET);
