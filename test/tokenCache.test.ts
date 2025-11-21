import { beforeEach, describe, expect, it } from "vitest";
import {
	RateLimitExceeded,
	toRateLimit,
} from "../src/shell/ingest/snapshot.js";
import {
	loadTokenEntries,
	removeTokenEntries,
	type TokenEntry,
	upsertTokenEntries,
} from "../src/shell/ingest/tokenCache.js";

class MockStorage implements Storage {
	private store = new Map<string, string>();

	get length(): number {
		return this.store.size;
	}

	clear(): void {
		this.store.clear();
	}

	getItem(key: string): string | null {
		return this.store.has(key) ? (this.store.get(key) as string) : null;
	}

	key(index: number): string | null {
		return Array.from(this.store.keys())[index] ?? null;
	}

	removeItem(key: string): void {
		this.store.delete(key);
	}

	setItem(key: string, value: string): void {
		this.store.set(key, value);
	}
}

describe("tokenCache", () => {
	beforeEach(() => {
		(globalThis as { localStorage: Storage }).localStorage = new MockStorage();
	});

	it("persists unique tokens with timestamps", () => {
		const entries: TokenEntry[] = upsertTokenEntries(
			[],
			[" ghp_one ", "ghp_two"],
		);
		const again = loadTokenEntries();

		expect(entries.map((e: TokenEntry) => e.value)).toEqual([
			"ghp_one",
			"ghp_two",
		]);
		expect(again.map((e: TokenEntry) => e.value)).toEqual([
			"ghp_one",
			"ghp_two",
		]);
		expect(again.every((e: TokenEntry) => typeof e.addedAt === "string")).toBe(
			true,
		);
	});

	it("removes specified tokens and keeps others", () => {
		const initial = upsertTokenEntries([], ["a", "b", "c"]);
		const cleaned = removeTokenEntries(initial, ["b"]);

		expect(cleaned.map((e: TokenEntry) => e.value)).toEqual(["a", "c"]);
		expect(loadTokenEntries().map((e: TokenEntry) => e.value)).toEqual([
			"a",
			"c",
		]);
	});
});

describe("toRateLimit", () => {
	it("converts RateLimitError-like objects", () => {
		const result = toRateLimit({
			_tag: "RateLimit",
			message: "hit",
			resetAt: 123,
		});
		expect(result).toBeInstanceOf(RateLimitExceeded);
		expect(result?.resetAt).toBe(123);
	});

	it("returns same RateLimitExceeded instance", () => {
		const err = new RateLimitExceeded("boom", 456);
		expect(toRateLimit(err)).toBe(err);
	});

	it("returns null for non-rate-limit errors", () => {
		expect(toRateLimit(new Error("nope"))).toBeNull();
	});
});
