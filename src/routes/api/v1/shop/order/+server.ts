import { withAuthProvider } from '$lib/server/endpoints/dependencies';
import { compose, withBodySchema } from '$lib/server/endpoints';
import { orderEndpoint } from './endpoint';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const bodySchema = z.object({
	itemId: z.number()
});

export const POST: RequestHandler = compose(
	withAuthProvider(),
	withBodySchema(bodySchema)
)(orderEndpoint);
