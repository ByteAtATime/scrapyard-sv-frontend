import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cache } from './cache';

describe('Cache', () => {
	let cache: Cache<string, number>;

	beforeEach(() => {
		vi.useFakeTimers();
		cache = new Cache(5000); // 5 seconds TTL
	});

	it('should store and retrieve values', () => {
		cache.set('key1', 100);
		expect(cache.get('key1')).toBe(100);
	});

	it('should return undefined for non-existent keys', () => {
		expect(cache.get('nonexistent')).toBeUndefined();
	});

	it('should expire values after TTL', () => {
		cache.set('key1', 100);
		expect(cache.get('key1')).toBe(100);

		vi.advanceTimersByTime(6000); // Advance past TTL
		expect(cache.get('key1')).toBeUndefined();
	});

	it('should not expire values before TTL', () => {
		cache.set('key1', 100);
		expect(cache.get('key1')).toBe(100);

		vi.advanceTimersByTime(4000); // Advance within TTL
		expect(cache.get('key1')).toBe(100);
	});

	it('should delete values', () => {
		cache.set('key1', 100);
		expect(cache.get('key1')).toBe(100);

		cache.delete('key1');
		expect(cache.get('key1')).toBeUndefined();
	});

	it('should clear all values', () => {
		cache.set('key1', 100);
		cache.set('key2', 200);
		expect(cache.get('key1')).toBe(100);
		expect(cache.get('key2')).toBe(200);

		cache.clear();
		expect(cache.get('key1')).toBeUndefined();
		expect(cache.get('key2')).toBeUndefined();
	});

	it('should work with different value types', () => {
		const objectCache = new Cache<string, { value: string }>(5000);
		const arrayCache = new Cache<string, string[]>(5000);

		objectCache.set('obj', { value: 'test' });
		arrayCache.set('arr', ['test']);

		expect(objectCache.get('obj')).toEqual({ value: 'test' });
		expect(arrayCache.get('arr')).toEqual(['test']);
	});

	it('should work with different key types', () => {
		const numberKeyCache = new Cache<number, string>(5000);
		const objectKeyCache = new Cache<{ id: number }, string>(5000);

		numberKeyCache.set(1, 'test');
		objectKeyCache.set({ id: 1 }, 'test');

		expect(numberKeyCache.get(1)).toBe('test');
		expect(objectKeyCache.get({ id: 1 })).toBeUndefined(); // Object keys are compared by reference
	});

	it('should update expiration time when value is set again', () => {
		cache.set('key1', 100);
		vi.advanceTimersByTime(4000); // Almost expired

		cache.set('key1', 100); // Set same value
		vi.advanceTimersByTime(4000); // Would have expired if not reset
		expect(cache.get('key1')).toBe(100); // Still valid
	});
});
