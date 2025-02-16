import { compose } from '$lib/server/endpoints';
import { withPointsRepo } from '$lib/server/endpoints/dependencies';
import { endpoint_GET } from './endpoint';

export const GET = compose(withPointsRepo())(endpoint_GET);
