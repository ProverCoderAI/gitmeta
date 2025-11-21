const STORAGE_KEY = "gitmeta.tokens";

export interface TokenEntry {
	readonly value: string;
	readonly addedAt: string;
}

const parseCache = (): TokenEntry[] => {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as Array<{
			value?: string;
			addedAt?: string;
		}>;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((item) => {
				if (typeof item.value === "string") {
					const addedAtValue = item.addedAt;
					return {
						value: item.value,
						addedAt:
							typeof addedAtValue === "string"
								? addedAtValue
								: new Date().toISOString(),
					} satisfies TokenEntry;
				}
				return null;
			})
			.filter((item): item is TokenEntry => item !== null);
	} catch {
		return [];
	}
};

const persistCache = (entries: ReadonlyArray<TokenEntry>) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const loadTokenEntries = (): TokenEntry[] => parseCache();

export const upsertTokenEntries = (
	existing: ReadonlyArray<TokenEntry>,
	values: ReadonlyArray<string>,
): TokenEntry[] => {
	const map = new Map<string, TokenEntry>();
	existing.forEach((entry) => {
		map.set(entry.value, entry);
	});
	values.forEach((value) => {
		const trimmed = value.trim();
		if (trimmed.length === 0) return;
		if (!map.has(trimmed)) {
			map.set(trimmed, { value: trimmed, addedAt: new Date().toISOString() });
		}
	});
	const merged = Array.from(map.values());
	persistCache(merged);
	return merged;
};

export const removeTokenEntries = (
	existing: ReadonlyArray<TokenEntry>,
	valuesToRemove: ReadonlyArray<string>,
): TokenEntry[] => {
	const removal = new Set(valuesToRemove.map((v) => v.trim()).filter(Boolean));
	const filtered = existing.filter((entry) => !removal.has(entry.value));
	persistCache(filtered);
	return filtered;
};
