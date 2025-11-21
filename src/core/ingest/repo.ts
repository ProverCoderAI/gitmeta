import * as Schema from "@effect/schema/Schema";
import * as TreeFormatter from "@effect/schema/TreeFormatter";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";

export interface RepoTarget {
	readonly host: "github.com";
	readonly owner: string;
	readonly name: string;
	readonly httpsUrl: string;
}

export type RepoParseError =
	| { readonly _tag: "EmptyInput"; readonly message: string }
	| { readonly _tag: "InvalidRepoUrl"; readonly message: string };

const NonEmptyString = pipe(Schema.String, Schema.minLength(1));

const RepoTargetSchema = Schema.Struct({
	host: Schema.Literal("github.com"),
	owner: NonEmptyString,
	name: NonEmptyString,
	httpsUrl: NonEmptyString,
});

const normalizeInput = (input: string): string => input.trim();

// CHANGE: Нормализовать и верифицировать ввод репозитория в детерминированное представление
// WHY: LLM-слой требует строгих ссылок owner/name и https-url перед построением ingest-плана
// QUOTE(ТЗ): "CORE: Исключительно чистые функции, неизменяемые данные"
// REF: user-message-3
// SOURCE: https://en.wikipedia.org/wiki/Pure_function ("the function return values are identical for identical arguments")
// FORMAT THEOREM: ∀input: parse(input) = RepoTarget ⇔ input валиден по шаблону
// PURITY: CORE
// EFFECT: Effect<RepoTarget, RepoParseError, never>
// INVARIANT: owner ≠ "" ∧ name ≠ "" ∧ host = github.com
// COMPLEXITY: O(1)/O(1)
export const parseRepoTarget = (
	input: string,
): Effect.Effect<RepoTarget, RepoParseError> =>
	Effect.suspend(() => {
		const normalized = normalizeInput(input);
		if (normalized.length === 0) {
			return Effect.fail({
				_tag: "EmptyInput",
				message: "Введите ссылку на GitHub репозиторий.",
			});
		}

		const pattern =
			/^(?:https?:\/\/github\.com\/)?(?<owner>[A-Za-z0-9_.-]+)\/(?<name>[A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;
		const match = normalized.match(pattern);
		if (match === null || match.groups === undefined) {
			return Effect.fail({
				_tag: "InvalidRepoUrl",
				message: "Ожидается https://github.com/owner/name",
			});
		}

		const { owner, name } = match.groups as { owner: string; name: string };
		const httpsUrl = `https://github.com/${owner}/${name}`;
		return pipe(
			Schema.decodeUnknown(RepoTargetSchema)({
				host: "github.com",
				owner,
				name,
				httpsUrl,
			}),
			Effect.mapError(
				(issue): RepoParseError => ({
					_tag: "InvalidRepoUrl",
					message: TreeFormatter.formatErrorSync(issue),
				}),
			),
		);
	});
