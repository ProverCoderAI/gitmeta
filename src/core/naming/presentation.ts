import { match } from "ts-pattern";

import type {
	Candidate,
	CandidateCatalog,
	CandidateTheme,
	CandidateTier,
} from "./candidate";

export interface CandidateCardViewModel {
	readonly id: string;
	readonly label: string;
	readonly slogan: string;
	readonly shortSense: string;
	readonly summary: string;
	readonly themeLabel: string;
	readonly accentGradient: string;
	readonly tier: CandidateTier;
	readonly aggregateScore: number;
	readonly formattedScore: string;
	readonly keyPoints: Candidate["keys"];
	readonly samplePrompt: string;
}

const SCORE_WEIGHTS = {
	clarity: 0.4,
	distinctiveness: 0.3,
	llmAffinity: 0.3,
} as const;

const describeTheme = (
	theme: CandidateTheme,
): { readonly label: string; readonly accentGradient: string } =>
	match(theme)
		.with("Lore", () => ({
			label: "Лоры репозитория",
			accentGradient: "linear-gradient(135deg, #f97316, #fb923c)",
		}))
		.with("Meta", () => ({
			label: "Метаданные + API",
			accentGradient: "linear-gradient(135deg, #6366f1, #a855f7)",
		}))
		.with("Mind", () => ({
			label: "Мысли проекта",
			accentGradient: "linear-gradient(135deg, #22c55e, #4ade80)",
		}))
		.with("Forge", () => ({
			label: "Сборка тредов",
			accentGradient: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
		}))
		.with("Canon", () => ({
			label: "Канон обсуждений",
			accentGradient: "linear-gradient(135deg, #f43f5e, #fb7185)",
		}))
		.with("Context", () => ({
			label: "Контекст вокруг кода",
			accentGradient: "linear-gradient(135deg, #10b981, #14b8a6)",
		}))
		.exhaustive();

const computeAggregateScore = (candidate: Candidate): number => {
	const raw =
		candidate.evaluation.clarity * SCORE_WEIGHTS.clarity +
		candidate.evaluation.distinctiveness * SCORE_WEIGHTS.distinctiveness +
		candidate.evaluation.llmAffinity * SCORE_WEIGHTS.llmAffinity;
	return Number(raw.toFixed(2));
};

const toCardViewModel = (candidate: Candidate): CandidateCardViewModel => {
	const { label, slogan, shortSense, description, tier, keys, samplePrompt } =
		candidate;
	const themeDescription = describeTheme(candidate.theme);
	const aggregateScore = computeAggregateScore(candidate);
	return {
		id: candidate.id,
		label,
		slogan,
		shortSense,
		summary: description,
		themeLabel: themeDescription.label,
		accentGradient: themeDescription.accentGradient,
		tier,
		aggregateScore,
		formattedScore: `${aggregateScore.toFixed(2)} / 5`,
		keyPoints: keys,
		samplePrompt,
	};
};

const sortByScore = (
	a: CandidateCardViewModel,
	b: CandidateCardViewModel,
): number => b.aggregateScore - a.aggregateScore;

// CHANGE: Преобразовать каталог в представление карточек с формальными инвариантами
// WHY: UI должен опираться на чистные вычисления score, чтобы оставаться доказуемым ядром
// QUOTE(ТЗ): "CORE: Исключительно чистые функции, неизменяемые данные"
// REF: user-message-1
// SOURCE: https://en.wikipedia.org/wiki/Pure_function ("the function return values are identical for identical arguments ... referential transparency")
// FORMAT THEOREM: ∀c ∈ Catalog: deterministic(c) → deterministic(toCard(c))
// PURITY: CORE
// EFFECT: None (pure transformation)
// INVARIANT: aggregateScore ∈ [1,5] ∧ ordering stable по score
// COMPLEXITY: O(n log n)/O(n)
export const buildCandidateCards = (
	catalog: CandidateCatalog,
): ReadonlyArray<CandidateCardViewModel> =>
	catalog.map(toCardViewModel).sort(sortByScore);

// CHANGE: Разделить карточки по уровням приоритетов
// WHY: Требуется структурировать результат под UX "Flagship" против "Reserve"
// QUOTE(ТЗ): "Functional Core, Imperative Shell"
// REF: user-message-1
// SOURCE: https://en.wikipedia.org/wiki/Pure_function
// FORMAT THEOREM: ∀card: tier(card) ∈ {Flagship, Reserve} → partition(card) корректно распределяет
// PURITY: CORE
// EFFECT: None
// INVARIANT: |flagship| + |reserve| = |cards|
// COMPLEXITY: O(n)/O(1)
export const partitionCardsByTier = (
	cards: ReadonlyArray<CandidateCardViewModel>,
): Record<CandidateTier, ReadonlyArray<CandidateCardViewModel>> => {
	const flagship: CandidateCardViewModel[] = [];
	const reserve: CandidateCardViewModel[] = [];
	cards.forEach((card) => {
		if (card.tier === "Flagship") {
			flagship.push(card);
			return;
		}
		reserve.push(card);
	});
	return {
		Flagship: flagship,
		Reserve: reserve,
	};
};
