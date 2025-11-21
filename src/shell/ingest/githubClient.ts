import type * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { match, P } from "ts-pattern";
import type {
	Issue,
	IssueComment,
	PullRequest,
	PullReview,
	PullReviewComment,
	RateLimitError,
	Release,
	RepoSummary,
	RepoTarget,
	SnapshotData,
} from "./types";

const GITHUB_API = "https://api.github.com";

const toUserError = (error: Cause.UnknownException): Error =>
	new Error(error.message);

const mapUnknownError = <A>(
	effect: Effect.Effect<A, Cause.UnknownException>,
): Effect.Effect<A, Error> => Effect.mapError(effect, toUserError);

const buildHeaders = (token?: string): Record<string, string> => {
	const trimmedToken = token?.trim();
	const baseHeaders: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "gitmeta-ingest-browser",
	};
	if (trimmedToken && trimmedToken.length > 0) {
		return { ...baseHeaders, Authorization: `Bearer ${trimmedToken}` };
	}
	return baseHeaders;
};

export const validateToken = (token: string): Effect.Effect<boolean, Error> =>
	Effect.gen(function* (_) {
		const headers = buildHeaders(token);
		const res = yield* _(
			mapUnknownError(
				Effect.tryPromise<Response>((signal) =>
					fetch(`${GITHUB_API}/rate_limit`, { headers, signal }),
				),
			),
		);
		if (res.status === 401) return false;
		if (res.status === 403) {
			const tokenScopes = res.headers.get("X-OAuth-Scopes");
			return tokenScopes !== null;
		}
		return res.ok;
	});

const buildUrl = (
	path: string,
	params?: Record<string, string | number>,
): URL => {
	const url = new URL(path, GITHUB_API);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, String(value));
		}
	}
	return url;
};

const parseRateLimitError = (
	res: Response,
): Effect.Effect<RateLimitError, Error> =>
	Effect.gen(function* (_) {
		const resetHeader = res.headers.get("X-RateLimit-Reset");
		const resetAt = resetHeader
			? Number.parseInt(resetHeader, 10) * 1000
			: undefined;
		const body = yield* _(mapUnknownError(Effect.tryPromise(() => res.text())));
		if (resetAt === undefined) {
			return {
				_tag: "RateLimit",
				message: `GitHub rate limit hit (${res.status}). Body: ${body.slice(0, 200)}`,
			};
		}
		return {
			_tag: "RateLimit",
			message: `GitHub rate limit hit (${res.status}). Reset at ${new Date(resetAt).toISOString()}. Body: ${body.slice(0, 200)}`,
			resetAt,
		};
	});

const readBody = (res: Response): Effect.Effect<string, Error> =>
	mapUnknownError(Effect.tryPromise(() => res.text()));

const readJson = <T>(res: Response): Effect.Effect<T, Error> =>
	mapUnknownError(Effect.tryPromise<T>(() => res.json()));

export class RateLimitExceeded extends Error {
	constructor(
		message: string,
		readonly resetAt?: number,
	) {
		super(message);
		this.name = "RateLimitExceeded";
	}
}

const failRateLimit = (
	parsed: RateLimitError,
): Effect.Effect<never, RateLimitExceeded> =>
	Effect.fail(new RateLimitExceeded(parsed.message, parsed.resetAt));

const toRateLimitExceeded = (
	payload:
		| RateLimitError
		| { readonly message: string; readonly resetAt?: number | undefined },
): RateLimitExceeded => new RateLimitExceeded(payload.message, payload.resetAt);

export const fetchJson = <T>(
	path: string,
	headers: Record<string, string>,
	params?: Record<string, string | number>,
): Effect.Effect<T, RateLimitExceeded | Error> =>
	Effect.gen(function* (_) {
		const url = buildUrl(path, params);
		const res = yield* _(
			mapUnknownError(
				Effect.tryPromise<Response>((signal) =>
					fetch(url, { headers, signal }),
				),
			),
		);

		if (res.status === 403) {
			const parsed = yield* _(parseRateLimitError(res));
			return yield* _(failRateLimit(parsed));
		}

		if (!res.ok) {
			const body = yield* _(readBody(res));
			return yield* _(
				Effect.fail(
					new Error(
						`GitHub API ${res.status} for ${url.toString()}: ${body.slice(0, 400)}`,
					),
				),
			);
		}

		return yield* _(readJson<T>(res));
	});

export const fetchAllPages = <T>(
	path: string,
	headers: Record<string, string>,
	baseParams?: Record<string, string | number>,
): Effect.Effect<ReadonlyArray<T>, RateLimitExceeded | Error> =>
	Effect.gen(function* (_) {
		const all: T[] = [];
		let page = 1;
		const perPage = 100;
		for (;;) {
			const params = { ...(baseParams ?? {}), per_page: perPage, page };
			const batch: ReadonlyArray<T> = yield* _(
				fetchJson<ReadonlyArray<T>>(path, headers, params),
			);
			if (!Array.isArray(batch) || batch.length === 0) {
				break;
			}
			batch.forEach((item: T) => {
				all.push(item);
			});
			if (batch.length < perPage) {
				break;
			}
			page += 1;
		}
		return all;
	});

const fetchPullExtras = (
	base: string,
	prNumber: number,
	headers: Record<string, string>,
): Effect.Effect<
	readonly [ReadonlyArray<PullReview>, ReadonlyArray<PullReviewComment>],
	RateLimitExceeded | Error
> =>
	Effect.gen(function* (_) {
		const reviews = yield* _(
			fetchAllPages<PullReview>(`${base}/pulls/${prNumber}/reviews`, headers),
		);
		const reviewComments = yield* _(
			fetchAllPages<PullReviewComment>(
				`${base}/pulls/${prNumber}/comments`,
				headers,
			),
		);
		return [reviews, reviewComments] as const;
	});

export const fetchSnapshot = (
	target: RepoTarget,
	token?: string,
): Effect.Effect<SnapshotData, RateLimitExceeded | Error> =>
	Effect.gen(function* (_) {
		const headers = buildHeaders(token);
		const base = `/repos/${target.owner}/${target.repo}`;

		const summary = yield* _(fetchJson<RepoSummary>(base, headers));
		const pagedIssues = yield* _(
			fetchAllPages<Issue>(`${base}/issues`, headers, { state: "all" }),
		);
		const issues = pagedIssues.filter(
			(issue) => issue.pull_request === undefined,
		);
		const pulls = yield* _(
			fetchAllPages<PullRequest>(`${base}/pulls`, headers, { state: "all" }),
		);
		const issueComments = yield* _(
			fetchAllPages<IssueComment>(`${base}/issues/comments`, headers),
		);
		const releases = yield* _(
			fetchAllPages<Release>(`${base}/releases`, headers),
		);

		const reviews: PullReview[] = [];
		const reviewComments: PullReviewComment[] = [];
		for (const pr of pulls) {
			const [r, rc] = yield* _(fetchPullExtras(base, pr.number, headers));
			reviews.push(...r);
			reviewComments.push(...rc);
		}

		return {
			summary,
			issues,
			pulls,
			issueComments,
			releases,
			reviewComments,
			reviews,
		};
	});

export const toRateLimit = (
	error:
		| RateLimitError
		| RateLimitExceeded
		| Error
		| object
		| string
		| number
		| boolean
		| null
		| undefined,
): RateLimitExceeded | null =>
	match(error)
		.with(P.instanceOf(RateLimitExceeded), (e) => e)
		.with(
			{
				_tag: "RateLimit",
				message: P.string,
				resetAt: P.optional(P.number),
			},
			toRateLimitExceeded,
		)
		.with(
			{
				name: "RateLimitExceeded",
				message: P.string,
				resetAt: P.optional(P.number),
			},
			toRateLimitExceeded,
		)
		.otherwise(() => null);
