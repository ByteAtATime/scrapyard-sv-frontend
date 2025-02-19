interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

export class Cache<K, V> {
	private cache = new Map<K, CacheEntry<V>>();
	private ttlMs: number;

	constructor(ttlMs: number) {
		this.ttlMs = ttlMs;
	}

	get(key: K): V | undefined {
		const entry = this.cache.get(key);
		if (!entry || Date.now() > entry.expiresAt) {
			return undefined;
		}
		return entry.value;
	}

	set(key: K, value: V): void {
		this.cache.set(key, {
			value,
			expiresAt: Date.now() + this.ttlMs
		});
	}

	delete(key: K): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}
}
