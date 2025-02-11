import { PostgresEventsRepository } from './postgres';

export const eventsRepository = new PostgresEventsRepository();

export * from './types';
export * from './event';
