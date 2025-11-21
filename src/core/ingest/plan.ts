import * as Schema from "@effect/schema/Schema";
import * as TreeFormatter from "@effect/schema/TreeFormatter";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";

import type { RepoTarget } from "./repo";

export interface IngestOptions {
	readonly includeIssues: boolean;
	readonly includePulls: boolean;
	readonly includeComments: boolean;
	readonly includeReviews: boolean;
	readonly includeReleases: boolean;
	readonly includePrivate: boolean;
	readonly outputDir: string;
}

export interface IngestPlan {
	readonly target: RepoTarget;
	readonly outputDir: string;
	readonly rawDir: string;
	readonly llmDir: string;
	readonly manifestPath: string;
	readonly summary: string;
	readonly cliCommand: string;
	readonly options: IngestOptions;
}

export type PlanBuildError = {
	readonly _tag: "InvalidOptions";
	readonly message: string;
};

const OptionsSchema = Schema.Struct({
	includeIssues: Schema.Boolean,
	includePulls: Schema.Boolean,
	includeComments: Schema.Boolean,
	includeReviews: Schema.Boolean,
	includeReleases: Schema.Boolean,
	includePrivate: Schema.Boolean,
	outputDir: pipe(Schema.String, Schema.minLength(1)),
});

const sanitizeOutputDir = (dir: string): string =>
	dir.trim().length === 0 ? ".gitmeta" : dir.trim();

const defaultPathFor = (dir: string, child: string): string =>
	`${dir}/${child}`;

// CHANGE: Build gitmeta export plan without side effects using validated options
// WHY: UI must rely on the pure core—paths and commands are deterministic from options
// QUOTE(ТЗ): "FUNCTIONAL CORE, IMPERATIVE SHELL"
// REF: user-message-3
// SOURCE: https://en.wikipedia.org/wiki/Pure_function
// FORMAT THEOREM: ∀opt: valid(opt) → plan is correct
// PURITY: CORE
// EFFECT: Effect<IngestPlan, PlanBuildError, never>
// INVARIANT: manifestPath ∈ outputDir ∧ rawDir, llmDir ⊂ outputDir
// COMPLEXITY: O(1)/O(1)
export const buildIngestPlan = (
	target: RepoTarget,
	options: IngestOptions,
): Effect.Effect<IngestPlan, PlanBuildError> =>
	pipe(
		Schema.decodeUnknown(OptionsSchema)({
			...options,
			outputDir: sanitizeOutputDir(options.outputDir),
			// Private flag is implicit via token usage; treat as always true for API shape.
			includePrivate: true,
		}),
		Effect.mapError(
			(issue): PlanBuildError => ({
				_tag: "InvalidOptions",
				message: TreeFormatter.formatErrorSync(issue),
			}),
		),
		Effect.map((validated) => {
			const rawDir = defaultPathFor(validated.outputDir, "raw");
			const llmDir = defaultPathFor(validated.outputDir, "llm");
			const manifestPath = `${validated.outputDir}/manifest.json`;
			const flags = [
				validated.includeIssues ? "--issues" : null,
				validated.includePulls ? "--pulls" : null,
				validated.includeComments ? "--comments" : null,
				validated.includeReviews ? "--reviews" : null,
				validated.includeReleases ? "--releases" : null,
				validated.includePrivate ? "--private" : null,
			].filter((flag): flag is string => flag !== null);
			const cliCommand = `npx gitmeta ingest ${target.owner}/${target.name} --out ${validated.outputDir}${
				flags.length > 0 ? ` ${flags.join(" ")}` : ""
			}`;
			return {
				target,
				outputDir: validated.outputDir,
				rawDir,
				llmDir,
				manifestPath,
				summary: `Export ${target.owner}/${target.name} to ${validated.outputDir}`,
				cliCommand,
				options: validated,
			};
		}),
	);
