import { z } from 'zod';

export const createEventSchema = z.object({
	name: z.string().min(1, 'Event name is required'),
	description: z.string().min(1, 'Description is required'),
	time: z.coerce.date().default(new Date()),
	attendancePoints: z.number().min(0, 'Points must be 0 or greater'),
	contactOrganizerId: z.number().nullable()
});
