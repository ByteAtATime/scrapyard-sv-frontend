import { compose, withBodySchema } from '$lib/server/endpoints';
import { withQuestService } from '$lib/server/endpoints/dependencies';
import type { RequestHandler } from './$types';
import { endpoint_GET, endpoint_PUT, endpoint_DELETE, putQuestSchema } from './endpoint';

export const GET: RequestHandler = compose(withQuestService())(endpoint_GET);

export const PUT: RequestHandler = compose(
	withQuestService(),
	withBodySchema(putQuestSchema)
)(endpoint_PUT);

export const DELETE: RequestHandler = compose(withQuestService())(endpoint_DELETE);
