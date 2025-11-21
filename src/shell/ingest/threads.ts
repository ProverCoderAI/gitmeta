import type {
	Issue,
	IssueComment,
	PullRequest,
	PullReview,
	PullReviewComment,
} from "./types";

export const groupBy = <T>(
	arr: ReadonlyArray<T>,
	keyFn: (x: T) => string | number | null | undefined,
): Record<string, ReadonlyArray<T>> => {
	const out: Record<string, T[]> = {};
	arr.forEach((item) => {
		const keyCandidate = keyFn(item);
		if (keyCandidate === null || keyCandidate === undefined) return;
		const key = String(keyCandidate);
		if (!out[key]) out[key] = [];
		out[key].push(item);
	});
	return out;
};

type ThreadMessageRole = "author" | "participant" | "review_comment";

type ThreadMessageLine = {
	readonly type: "message";
	readonly role: ThreadMessageRole;
	readonly author: string;
	readonly created_at: string;
	readonly text: string;
};

type BaseMetaLine = {
	readonly type: "meta";
	readonly repo: string;
	readonly number: number;
	readonly title: string;
	readonly state: string;
	readonly author: string;
	readonly labels: ReadonlyArray<string>;
	readonly assignees: ReadonlyArray<string>;
	readonly milestone: string | null;
	readonly created_at: string;
	readonly closed_at: string | null;
};

type IssueThreadLine =
	| (BaseMetaLine & { readonly obj_type: "issue" })
	| ThreadMessageLine;

type PullThreadLine =
	| (BaseMetaLine & {
			readonly obj_type: "pull";
			readonly merged_at: string | null;
	  })
	| ThreadMessageLine
	| {
			readonly type: "review";
			readonly author: string;
			readonly state: string;
			readonly created_at: string | null;
			readonly text: string;
	  };

const serialize = (
	lines: ReadonlyArray<IssueThreadLine | PullThreadLine>,
): string => `${lines.map((row) => JSON.stringify(row)).join("\n")}\n`;

export const buildIssueThread = (
	issue: Issue,
	comments: ReadonlyArray<IssueComment>,
	repoName: string,
): string => {
	const lines: IssueThreadLine[] = [
		{
			type: "meta",
			obj_type: "issue",
			repo: repoName,
			number: issue.number,
			title: issue.title,
			state: issue.state,
			author: issue.user.login,
			labels: (issue.labels ?? []).map((l) => l.name),
			assignees: (issue.assignees ?? []).map((a) => a.login),
			milestone: issue.milestone?.title ?? null,
			created_at: issue.created_at,
			closed_at: issue.closed_at,
		},
	];

	if (issue.body) {
		lines.push({
			type: "message",
			role: "author",
			author: issue.user.login,
			created_at: issue.created_at,
			text: issue.body,
		});
	}

	comments.forEach((comment) => {
		lines.push({
			type: "message",
			role: "participant",
			author: comment.user.login,
			created_at: comment.created_at,
			text: comment.body,
		});
	});

	return serialize(lines);
};

const pushPullMeta = (
	lines: PullThreadLine[],
	pr: PullRequest,
	repoName: string,
): void => {
	lines.push({
		type: "meta",
		obj_type: "pull",
		repo: repoName,
		number: pr.number,
		title: pr.title,
		state: pr.state,
		merged_at: pr.merged_at,
		author: pr.user.login,
		labels: (pr.labels ?? []).map((l) => l.name),
		assignees: (pr.assignees ?? []).map((a) => a.login),
		milestone: pr.milestone?.title ?? null,
		created_at: pr.created_at,
		closed_at: pr.closed_at,
	});
};

const pushReviews = (
	lines: PullThreadLine[],
	reviews: ReadonlyArray<PullReview>,
): void => {
	reviews.forEach((review) => {
		lines.push({
			type: "review",
			author: review.user?.login ?? "unknown",
			state: review.state,
			created_at: review.submitted_at,
			text: review.body ?? "",
		});
	});
};

const pushReviewComments = (
	lines: PullThreadLine[],
	comments: ReadonlyArray<PullReviewComment>,
): void => {
	comments.forEach((comment) => {
		lines.push({
			type: "message",
			role: "review_comment",
			author: comment.user.login,
			created_at: comment.created_at,
			text: comment.body,
		});
	});
};

export const buildPullThread = (
	pr: PullRequest,
	reviews: ReadonlyArray<PullReview>,
	reviewComments: ReadonlyArray<PullReviewComment>,
	repoName: string,
): string => {
	const lines: PullThreadLine[] = [];
	pushPullMeta(lines, pr, repoName);

	if (pr.body) {
		lines.push({
			type: "message",
			role: "author",
			author: pr.user.login,
			created_at: pr.created_at,
			text: pr.body,
		});
	}

	pushReviews(lines, reviews);
	pushReviewComments(lines, reviewComments);

	return serialize(lines);
};
