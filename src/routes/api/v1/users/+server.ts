import { compose, withQuerySchema } from '$lib/server/endpoints';
import { withUserService } from '$lib/server/endpoints/dependencies';
import { endpoint_GET, querySchema } from './endpoint';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = compose(
	withUserService(),
	withQuerySchema(querySchema)
)(endpoint_GET);
