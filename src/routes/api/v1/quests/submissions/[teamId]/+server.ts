import { compose, withRouteParams } from '$lib/server/endpoints';
import { withQuestService, withAuthProvider } from '$lib/server/endpoints/dependencies';
import { endpoint_GET } from './endpoint';
import { z } from 'zod';

// Define schema for route parameters
const teamParamsSchema = z.object({
	teamId: z.coerce.number().int().positive('Team ID must be a positive integer')
});

// Get submissions for a team
export const GET = compose(
	withAuthProvider(),
	withQuestService(),
	withRouteParams(teamParamsSchema)
)(endpoint_GET);
