import { compose } from '$lib/server/endpoints';
import { withAuthProvider } from '$lib/server/endpoints/dependencies';
import { endpoint_GET } from './endpoint';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = compose(withAuthProvider())(endpoint_GET);
