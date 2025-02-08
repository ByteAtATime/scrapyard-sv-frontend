export interface User {
	id: number;
	name: string;
	email: string;
	totalPoints: number;
	isOrganizer: boolean;
}

export interface UserSelectMethod {
	onSelect: (user: User) => void;
}
