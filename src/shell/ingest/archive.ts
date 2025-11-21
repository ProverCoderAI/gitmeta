import type {
	Issue,
	IssueComment,
	PullRequest,
	PullReview,
	PullReviewComment,
	Release,
	SnapshotData,
} from "./types";

const escapeBody = (body: string | null | undefined): string => {
	if (!body) return "";
	if (body.length > 4000) return `${body.slice(0, 4000)}\n...[truncated]...`;
	return body;
};

const fmtDate = (s: string | null | undefined): string =>
	s ? new Date(s).toISOString() : "n/a";

const joinList = (items: ReadonlyArray<string> | undefined | null): string => {
	if (!items || items.length === 0) return "—";
	return items.join(", ");
};

const appendBodyIfPresent = (
	lines: string[],
	body: string | null | undefined,
): void => {
	const escaped = escapeBody(body);
	if (!escaped) return;
	lines.push("Body:");
	lines.push(escaped);
};

const appendIssueEntry = (lines: string[], issue: Issue): void => {
	const labels = issue.labels?.map((l) => l.name) ?? [];
	const assignees = issue.assignees?.map((u) => u.login) ?? [];
	const milestone = issue.milestone?.title ?? null;
	lines.push(
		`#${issue.number} ${issue.title} [${issue.state}] by ${issue.user.login} @ ${fmtDate(issue.created_at)}`,
	);
	lines.push(`Labels: ${joinList(labels)}`);
	lines.push(`Assignees: ${joinList(assignees)}`);
	lines.push(`Milestone: ${milestone ?? "—"}`);
	appendBodyIfPresent(lines, issue.body);
	lines.push("---");
};

export const extractNumber = (url: string): string => {
	const m = url.match(/\/(\d+)(?:$|[?#])/);
	return m?.[1] ?? "?";
};

const appendSummary = (
	lines: string[],
	summary: SnapshotData["summary"],
): void => {
	lines.push("=== SUMMARY ===");
	lines.push(`Repository: ${summary.full_name}`);
	lines.push(`Description: ${summary.description ?? "n/a"}`);
	lines.push(`Default branch: ${summary.default_branch}`);
	lines.push(`Last push: ${fmtDate(summary.pushed_at)}`);
	lines.push(`Stars: ${summary.stargazers_count}`);
	lines.push(`Forks: ${summary.forks_count}`);
	lines.push(`Open issues (GitHub): ${summary.open_issues_count}`);
};

const appendIssues = (lines: string[], issues: ReadonlyArray<Issue>): void => {
	lines.push("=== ISSUES ===");
	if (issues.length === 0) {
		lines.push("(no issues)");
		return;
	}
	issues.forEach((issue) => {
		appendIssueEntry(lines, issue);
	});
};

const mergedSuffix = (pr: PullRequest): string =>
	pr.merged_at === null ? "" : ", merged";

const milestoneTitle = (value: PullRequest["milestone"]): string =>
	value?.title ?? "—";

const appendPullEntry = (lines: string[], pr: PullRequest): void => {
	const labels = (pr.labels ?? []).map((l) => l.name);
	const assignees = (pr.assignees ?? []).map((u) => u.login);
	lines.push(
		`PR #${pr.number} ${pr.title} [${pr.state}${mergedSuffix(pr)}] by ${pr.user.login} @ ${fmtDate(pr.created_at)}`,
	);
	lines.push(`Labels: ${joinList(labels)}`);
	lines.push(`Assignees: ${joinList(assignees)}`);
	lines.push(`Milestone: ${milestoneTitle(pr.milestone)}`);
	appendBodyIfPresent(lines, pr.body);
	lines.push("---");
};

const appendPulls = (
	lines: string[],
	pulls: ReadonlyArray<PullRequest>,
): void => {
	lines.push("=== PULL REQUESTS ===");
	if (pulls.length === 0) {
		lines.push("(no pull requests)");
		return;
	}
	pulls.forEach((pr) => {
		appendPullEntry(lines, pr);
	});
};

const appendIssueComments = (
	lines: string[],
	issueComments: ReadonlyArray<IssueComment>,
): void => {
	lines.push("=== ISSUE COMMENTS ===");
	if (issueComments.length === 0) {
		lines.push("(no issue comments)");
		return;
	}
	for (const c of issueComments) {
		const issueNumber = extractNumber(c.issue_url);
		lines.push(
			`${c.user.login} @ ${fmtDate(c.created_at)} on issue #${issueNumber}`,
		);
		lines.push(escapeBody(c.body));
		lines.push("---");
	}
};

const appendReviewEvents = (
	lines: string[],
	reviews: ReadonlyArray<PullReview>,
): void => {
	if (reviews.length === 0) return;
	lines.push(">> Review events:");
	reviews.forEach((review) => {
		const prNumber = extractNumber(review.pull_request_url);
		lines.push(
			`${review.user?.login ?? "unknown"} @ ${fmtDate(review.submitted_at)} on PR #${prNumber} [state=${review.state}]`,
		);
		const body = escapeBody(review.body);
		if (body) lines.push(body);
		lines.push("---");
	});
};

const appendReviewComments = (
	lines: string[],
	reviewComments: ReadonlyArray<PullReviewComment>,
): void => {
	if (reviewComments.length === 0) return;
	lines.push("");
	lines.push(">> Review comments:");
	reviewComments.forEach((comment) => {
		const prNumber = extractNumber(comment.pull_request_url);
		lines.push(
			`${comment.user.login} @ ${fmtDate(comment.created_at)} on PR #${prNumber}`,
		);
		lines.push(escapeBody(comment.body));
		lines.push("---");
	});
};

const appendReviews = (
	lines: string[],
	reviews: ReadonlyArray<PullReview>,
	reviewComments: ReadonlyArray<PullReviewComment>,
): void => {
	lines.push("=== PR REVIEWS ===");
	if (reviews.length === 0 && reviewComments.length === 0) {
		lines.push("(no PR reviews)");
		return;
	}
	appendReviewEvents(lines, reviews);
	appendReviewComments(lines, reviewComments);
};

const appendReleases = (
	lines: string[],
	releases: ReadonlyArray<Release>,
): void => {
	lines.push("=== RELEASES ===");
	if (releases.length === 0) {
		lines.push("(no releases)");
		return;
	}
	for (const rel of releases) {
		lines.push(
			`Release ${rel.tag_name} (${rel.name ?? "n/a"}) created ${fmtDate(rel.created_at)}, published ${fmtDate(rel.published_at)}`,
		);
		const body = escapeBody(rel.body);
		if (body) {
			lines.push("Notes:");
			lines.push(body);
		}
		lines.push("---");
	}
};

// CHANGE: Make archive builder pure and deterministic.
// WHY: Enforces functional core and satisfies linted function size.
// PURITY: CORE
// INVARIANT: Output ordering mirrors snapshot sections without mutation of input.
// COMPLEXITY: O(n) time / O(n) space where n = total snapshot entities.
export const buildArchiveText = (snap: SnapshotData): string => {
	const lines: string[] = [];
	appendSummary(lines, snap.summary);
	lines.push("");
	lines.push("");
	appendIssues(lines, snap.issues);
	lines.push("");
	lines.push("");
	appendPulls(lines, snap.pulls);
	lines.push("");
	lines.push("");
	appendIssueComments(lines, snap.issueComments);
	lines.push("");
	lines.push("");
	appendReviews(lines, snap.reviews, snap.reviewComments);
	lines.push("");
	lines.push("");
	appendReleases(lines, snap.releases);
	return lines.join("\n");
};
