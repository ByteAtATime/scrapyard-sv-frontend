import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

export class Logger {
	private prefix: string;
	private enabled: boolean;

	constructor(prefix: string) {
		this.prefix = prefix;
		// Enable logging if ENABLE_DEBUG_LOGGING is set to 'true' or in dev mode
		this.enabled = env.ENABLE_DEBUG_LOGGING === 'true' || dev;
	}

	debug(message: string, ...args: unknown[]): void {
		if (!this.enabled) return;
		console.debug(`[${this.prefix}] ${message}`, ...args);
	}

	info(message: string, ...args: unknown[]): void {
		if (!this.enabled) return;
		console.info(`[${this.prefix}] ${message}`, ...args);
	}

	warn(message: string, ...args: unknown[]): void {
		if (!this.enabled) return;
		console.warn(`[${this.prefix}] ${message}`, ...args);
	}

	error(message: string, ...args: unknown[]): void {
		// Always log errors regardless of debug setting
		console.error(`[${this.prefix}] ${message}`, ...args);
	}
}
