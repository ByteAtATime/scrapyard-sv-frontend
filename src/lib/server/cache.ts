export class Cache<T> {
	private cache: Map<string, { value: T; expiresAt: number }>;
	private defaultTTL: number;

	constructor(ttlSeconds: number = 300) {
		// Default 5 minutes TTL
		this.cache = new Map();
		this.defaultTTL = ttlSeconds * 1000; // Convert to milliseconds
	}

	set(key: string, value: T, ttlSeconds?: number): void {
		const expiresAt = Date.now() + (ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL);
		this.cache.set(key, { value, expiresAt });
	}

	get(key: string): T | undefined {
		const item = this.cache.get(key);
		if (!item) return undefined;

		if (Date.now() > item.expiresAt) {
			this.cache.delete(key);
			return undefined;
		}

		return item.value;
	}

	delete(key: string): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	// Helper method to create cache keys
	static createKey(prefix: string, ...parts: (string | number)[]): string {
		return `${prefix}:${parts.join(':')}`;
	}
}
