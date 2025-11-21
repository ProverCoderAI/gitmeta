import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import { useMemo } from "react";

import { getCandidateCatalog } from "../../core/naming/catalog";
import {
	buildCandidateCards,
	type CandidateCardViewModel,
	partitionCardsByTier,
} from "../../core/naming/presentation";

export interface CandidateCatalogSnapshot {
	readonly flagship: ReadonlyArray<CandidateCardViewModel>;
	readonly reserve: ReadonlyArray<CandidateCardViewModel>;
	readonly total: number;
}

// CHANGE: Сформировать оболочку, которая запускает чистый пайплайн через Effect внутри React
// WHY: Требуется контролируемый эффект для интеграции functional core с UI-хуками
// QUOTE(ТЗ): "SHELL: Все эффекты (IO, сеть, БД) изолированы в тонкой оболочке"
// REF: user-message-1
// SOURCE: https://en.wikipedia.org/wiki/Pure_function
// FORMAT THEOREM: ∀render: runEffect(render) → результат = provide(core)
// PURITY: SHELL
// EFFECT: Effect<CandidateCatalogSnapshot, never, never>
// INVARIANT: total = |flagship| + |reserve|
// COMPLEXITY: O(n log n)/O(n)
export const useCandidateCatalog = (): CandidateCatalogSnapshot =>
	useMemo(() => {
		const effect = pipe(
			Effect.sync(getCandidateCatalog),
			Effect.map(buildCandidateCards),
			Effect.map((cards) => {
				const partitioned = partitionCardsByTier(cards);
				return {
					flagship: partitioned.Flagship,
					reserve: partitioned.Reserve,
					total: cards.length,
				};
			}),
		);
		return Effect.runSync(effect);
	}, []);
