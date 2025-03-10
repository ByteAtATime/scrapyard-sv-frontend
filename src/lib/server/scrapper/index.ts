export * from './types';
export * from './service';
export * from './session';
export * from './scrap';
export * from './postgres';

// Export the repository implementation
import { PostgresScrapperRepo } from './postgres';

// Export constants
export {
	MIN_SESSION_DURATION_MINUTES,
	BASE_POINTS_PER_HOUR,
	VOTER_POINTS_PER_VOTE,
	CREATOR_POINTS_PER_HOUR_PER_VOTE,
	MAX_VOTES_PER_HOUR
} from './session';

// Export default instances
export const scrapperRepo = new PostgresScrapperRepo();
