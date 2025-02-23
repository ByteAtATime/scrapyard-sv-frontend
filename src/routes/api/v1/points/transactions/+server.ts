import { compose } from '$lib/server/endpoints';
import { withPointsService } from '$lib/server/endpoints/dependencies';
import { endpoint_GET } from './endpoint';

export const GET = compose(withPointsService())(endpoint_GET);
