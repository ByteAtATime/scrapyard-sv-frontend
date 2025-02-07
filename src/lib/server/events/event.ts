import { z } from 'zod';
import type { EventData } from '$lib/server/db/types';
import type { IAuthProvider } from '../auth/types';
import { User, userJsonSchema } from '../auth/user';

export const eventJsonSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	attendancePoints: z.number(),
	time: z.coerce.date(),
	contactOrganizer: userJsonSchema.nullable()
});
export type EventJson = z.infer<typeof eventJsonSchema>;

export class Event {
	constructor(
		private readonly data: EventData,
		private readonly authProvider: IAuthProvider
	) {}

	public get id(): number {
		return this.data.id;
	}

	public get name(): string {
		return this.data.name;
	}

	public get description(): string {
		return this.data.description;
	}

	public get attendancePoints(): number {
		return this.data.attendancePoints;
	}

	public get time(): Date {
		return this.data.time;
	}

	public async getContactOrganizer(): Promise<User | null> {
		if (!this.data.contactOrganizerId) return null;

		const userData = await this.authProvider.getUserById(this.data.contactOrganizerId);
		if (!userData) return null;

		return new User(userData, this.authProvider);
	}

	public async toJson(): Promise<EventJson> {
		return eventJsonSchema.parse({
			id: this.id,
			name: this.name,
			description: this.description,
			time: this.time,
			attendancePoints: this.attendancePoints,
			contactOrganizer: await this.getContactOrganizer()
		});
	}
}
