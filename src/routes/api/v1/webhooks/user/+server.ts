import { compose, withBodySchema } from '$lib/server/endpoints';
import { withUserService } from '$lib/server/endpoints/dependencies';
import type { RequestHandler } from './$types';
import { endpoint_POST, webhookSchema } from './endpoint';

export const POST: RequestHandler = compose(
	withUserService(),
	withBodySchema(webhookSchema)
)(endpoint_POST);
