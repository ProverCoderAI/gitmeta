import * as Schema from "@effect/schema/Schema";
import { pipe } from "effect/Function";

export type CandidateTier = "Flagship" | "Reserve";
export type CandidateTheme =
	| "Lore"
	| "Meta"
	| "Mind"
	| "Forge"
	| "Canon"
	| "Context";
export type CandidateScore = number;

export interface CandidateEvaluation {
	readonly clarity: CandidateScore;
	readonly distinctiveness: CandidateScore;
	readonly llmAffinity: CandidateScore;
}

export interface Candidate {
	readonly id: string;
	readonly label: string;
	readonly shortSense: string;
	readonly description: string;
	readonly theme: CandidateTheme;
	readonly tier: CandidateTier;
	readonly slogan: string;
	readonly keys: ReadonlyArray<string>;
	readonly samplePrompt: string;
	readonly evaluation: CandidateEvaluation;
}

const NonEmptyString = pipe(Schema.String, Schema.minLength(1));

const CandidateScoreSchema = pipe(
	Schema.Number,
	Schema.int(),
	Schema.between(1, 5),
);

export const CandidateEvaluationSchema = Schema.Struct({
	clarity: CandidateScoreSchema,
	distinctiveness: CandidateScoreSchema,
	llmAffinity: CandidateScoreSchema,
});

export const CandidateSchema = Schema.Struct({
	id: NonEmptyString,
	label: NonEmptyString,
	shortSense: NonEmptyString,
	description: NonEmptyString,
	theme: Schema.Literal("Lore", "Meta", "Mind", "Forge", "Canon", "Context"),
	tier: Schema.Literal("Flagship", "Reserve"),
	slogan: NonEmptyString,
	keys: pipe(Schema.Array(NonEmptyString), Schema.minItems(1)),
	samplePrompt: NonEmptyString,
	evaluation: CandidateEvaluationSchema,
});

export const CandidateCatalogSchema = Schema.Array(CandidateSchema);

export type CandidateCatalog = ReadonlyArray<Candidate>;
