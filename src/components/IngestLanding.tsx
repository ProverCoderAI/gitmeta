import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { pipe } from "effect/Function";
import type React from "react";
import { useEffect, useState } from "react";
import { match, P } from "ts-pattern";
import {
	buildIngestPlan,
	type IngestOptions,
	type IngestPlan,
	type PlanBuildError,
} from "../core/ingest/plan";
import { parseRepoTarget, type RepoParseError } from "../core/ingest/repo";
import {
	buildArchiveText,
	buildZip,
	fetchSnapshot,
	type RateLimitExceeded,
	type SnapshotData,
	toRateLimit,
	validateToken,
} from "../shell/ingest/snapshot";
import {
	loadTokenEntries,
	removeTokenEntries,
	upsertTokenEntries,
} from "../shell/ingest/tokenCache";
import { IngestForm } from "./IngestForm";
import { ResultPanel } from "./IngestResultPanel";

type SubmitState =
	| { readonly _tag: "Idle" }
	| { readonly _tag: "Submitting" }
	| {
			readonly _tag: "Success";
			readonly plan: IngestPlan;
			readonly archiveText: string;
			readonly gitmetaUrl: string;
			readonly zipUrl: string;
			readonly counts: Record<string, number>;
	  }
	| { readonly _tag: "Error"; readonly message: string };

const defaultOptions: IngestOptions = {
	includeIssues: true,
	includePulls: true,
	includeComments: true,
	includeReviews: true,
	includeReleases: true,
	includePrivate: false,
	outputDir: ".gitmeta",
};

const isPrivateTokenMissing = (
	options: IngestOptions,
	tokens: ReadonlyArray<string>,
): boolean => options.includePrivate && tokens.length === 0;

const normalizeTokens = (input: string): ReadonlyArray<string> =>
	input
		.split(/[\s,]+/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0);

const validateTokens = (
	tokens: ReadonlyArray<string>,
): Effect.Effect<
	{
		readonly valid: ReadonlyArray<string>;
		readonly invalid: ReadonlyArray<string>;
	},
	Error
> =>
	Effect.gen(function* (_) {
		const valid: string[] = [];
		const invalid: string[] = [];
		for (const token of tokens) {
			const ok = yield* _(validateToken(token));
			if (ok) {
				valid.push(token);
			} else {
				invalid.push(token);
			}
		}
		return { valid, invalid };
	});

const buildEffect = (
	repoInput: string,
	options: IngestOptions,
	token: string,
): Effect.Effect<
	{ readonly plan: IngestPlan; readonly snap: SnapshotData },
	PlanBuildError | RepoParseError | RateLimitExceeded | Error
> =>
	pipe(
		parseRepoTarget(repoInput),
		Effect.flatMap((target) => buildIngestPlan(target, options)),
		Effect.flatMap((plan) =>
			Effect.map(
				fetchSnapshot(
					{ owner: plan.target.owner, repo: plan.target.name },
					token.trim().length > 0 ? token : undefined,
				),
				(snap) => ({
					plan,
					snap,
				}),
			),
		),
	);

const toFailureMessage = (
	cause: Cause.Cause<
		PlanBuildError | RepoParseError | RateLimitExceeded | Error
	>,
): { readonly message: string } => {
	const failureOpt = Cause.failureOption(cause);
	if (failureOpt._tag === "None") {
		return { message: Cause.pretty(cause) };
	}
	const rate = toRateLimit(failureOpt.value);
	if (rate !== null) {
		return { message: rate.message };
	}
	const message = match(failureOpt.value)
		.with({ message: P.string }, ({ message: msg }) => msg)
		.otherwise(() => null);
	return { message: message ?? Cause.pretty(cause) };
};

const toSuccessState = (plan: IngestPlan, snap: SnapshotData): SubmitState => {
	const archiveText = buildArchiveText(snap);
	const gitmetaBlob = new Blob([archiveText], { type: "text/plain" });
	const gitmetaUrl = URL.createObjectURL(gitmetaBlob);
	const zipBlob = Effect.runSync(buildZip(snap));
	const zipUrl = URL.createObjectURL(zipBlob);
	return {
		_tag: "Success",
		plan,
		archiveText,
		gitmetaUrl,
		zipUrl,
		counts: {
			issues: snap.issues.length,
			pulls: snap.pulls.length,
			issueComments: snap.issueComments.length,
			reviewComments: snap.reviewComments.length,
			reviews: snap.reviews.length,
			releases: snap.releases.length,
		},
	};
};

const renderStatus = (state: SubmitState): React.ReactNode =>
	match(state)
		.with({ _tag: "Success" }, ({ plan, archiveText, gitmetaUrl, zipUrl }) => (
			<ResultPanel
				plan={plan}
				archiveText={archiveText}
				gitmetaUrl={gitmetaUrl}
				zipUrl={zipUrl}
			/>
		))
		.with({ _tag: "Error" }, ({ message }) => (
			<div className="status status--error">{message}</div>
		))
		.with({ _tag: "Submitting" }, () => (
			<div className="status status--loading">Contacting GitHub…</div>
		))
		.otherwise(() => null);

const submitIngest = (
	repoInput: string,
	options: IngestOptions,
	tokenInput: string,
	setState: React.Dispatch<React.SetStateAction<SubmitState>>,
	onTokensUpdate: (serialized: string) => void,
) => {
	const parsedTokens = normalizeTokens(tokenInput);
	if (isPrivateTokenMissing(options, parsedTokens)) {
		setState({
			_tag: "Error",
			message: "GitHub token required for private repos.",
		});
		return;
	}
	setState({ _tag: "Submitting" });
	const existingEntries = loadTokenEntries();
	void Effect.runPromiseExit(
		Effect.gen(function* (_) {
			const { valid, invalid } = yield* _(validateTokens(parsedTokens));
			if (options.includePrivate && valid.length === 0) {
				return yield* _(Effect.fail(new Error("No working token found.")));
			}
			const updated = upsertTokenEntries(existingEntries, valid);
			const cleaned =
				invalid.length > 0 ? removeTokenEntries(updated, invalid) : updated;
			const chosenToken = cleaned[0]?.value ?? "";
			const result = yield* _(buildEffect(repoInput, options, chosenToken));
			return { result, cleaned };
		}),
	).then((exit) => {
		Exit.match(exit, {
			onFailure: (cause) => {
				setState({ _tag: "Error", ...toFailureMessage(cause) });
			},
			onSuccess: ({ result, cleaned }) => {
				setState(toSuccessState(result.plan, result.snap));
				onTokensUpdate(cleaned.map((entry) => entry.value).join("\n"));
			},
		});
	});
};

const useIngestController = () => {
	const [repoInput, setRepoInput] = useState<string>("");
	const [options, setOptions] = useState<IngestOptions>(defaultOptions);
	const [token, setToken] = useState<string>(() =>
		loadTokenEntries()
			.map((entry) => entry.value)
			.join("\n"),
	);
	const [state, setState] = useState<SubmitState>({ _tag: "Idle" });

	useEffect(() => {
		return () => {
			if (state._tag === "Success") {
				URL.revokeObjectURL(state.gitmetaUrl);
				URL.revokeObjectURL(state.zipUrl);
			}
		};
	}, [state]);

	const toggleOption = (key: keyof IngestOptions) => {
		setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
		event.preventDefault();
		submitIngest(repoInput, options, token, setState, setToken);
	};

	return {
		repoInput,
		options,
		token,
		setRepoInput,
		setToken,
		toggleOption,
		updateOutputDir: (value: string) => {
			setOptions((prev) => ({ ...prev, outputDir: value }));
		},
		handleSubmit,
		submitting: state._tag === "Submitting",
		statusSlot: renderStatus(state),
	};
};

const IngestLanding = () => {
	const controller = useIngestController();

	return (
		<div className="landing">
			<header className="hero">
				<p className="hero__eyebrow">Prompt-friendly metadata · GitHub</p>
				<h1>Prompt-ready repo digest</h1>
				<p className="hero__lede">
					Turn any GitHub repo into a single text + zip snapshot for LLMs.
				</p>
			</header>

			<IngestForm
				repoInput={controller.repoInput}
				options={controller.options}
				token={controller.token}
				submitting={controller.submitting}
				onRepoChange={controller.setRepoInput}
				onToggleOption={controller.toggleOption}
				onOutputDirChange={controller.updateOutputDir}
				onTokenChange={controller.setToken}
				onSubmit={controller.handleSubmit}
				statusSlot={controller.statusSlot}
			/>
		</div>
	);
};

export default IngestLanding;
