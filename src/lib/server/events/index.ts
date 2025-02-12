import { PostgresEventsRepo } from './postgres';

export const eventsRepo = new PostgresEventsRepo();

export * from './types';
export * from './event';
