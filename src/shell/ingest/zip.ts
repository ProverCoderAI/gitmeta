import * as Effect from "effect/Effect";
import { strToU8, zipSync } from "fflate";
import { buildArchiveText, extractNumber } from "./archive";
import { buildIssueThread, buildPullThread, groupBy } from "./threads";
import type { SnapshotData } from "./types";

type FileMap = Record<string, Uint8Array>;

const write = (
	files: FileMap,
	base: string,
	relPath: string,
	content: string,
) => {
	files[`${base}/${relPath}`] = strToU8(content);
};

const writeIssues = (
	files: FileMap,
	base: string,
	snap: SnapshotData,
): void => {
	snap.issues.forEach((issue) => {
		write(
			files,
			base,
			`raw/issues/${issue.number}.json`,
			JSON.stringify(issue, null, 2),
		);
	});
};

const writePulls = (files: FileMap, base: string, snap: SnapshotData): void => {
	snap.pulls.forEach((pr) => {
		write(
			files,
			base,
			`raw/pulls/${pr.number}.json`,
			JSON.stringify(pr, null, 2),
		);
	});
};

const writeIssueComments = (
	files: FileMap,
	base: string,
	snap: SnapshotData,
): void => {
	snap.issueComments.forEach((comment) => {
		write(
			files,
			base,
			`raw/issue_comments/${comment.id}.json`,
			JSON.stringify(comment, null, 2),
		);
	});
};

const writeReleases = (
	files: FileMap,
	base: string,
	snap: SnapshotData,
): void => {
	snap.releases.forEach((release) => {
		write(
			files,
			base,
			`raw/releases/${release.id}.json`,
			JSON.stringify(release, null, 2),
		);
	});
};

const writeReviews = (
	files: FileMap,
	base: string,
	snap: SnapshotData,
): void => {
	snap.reviews.forEach((review) => {
		write(
			files,
			base,
			`raw/reviews/${extractNumber(review.pull_request_url)}-${review.id}.json`,
			JSON.stringify(review, null, 2),
		);
	});
};

const writeReviewComments = (
	files: FileMap,
	base: string,
	snap: SnapshotData,
): void => {
	snap.reviewComments.forEach((comment) => {
		write(
			files,
			base,
			`raw/review_comments/${extractNumber(comment.pull_request_url)}-${comment.id}.json`,
			JSON.stringify(comment, null, 2),
		);
	});
};

const writeRaw = (files: FileMap, base: string, snap: SnapshotData): void => {
	write(files, base, "raw/summary.json", JSON.stringify(snap.summary, null, 2));
	writeIssues(files, base, snap);
	writePulls(files, base, snap);
	writeIssueComments(files, base, snap);
	writeReleases(files, base, snap);
	writeReviews(files, base, snap);
	writeReviewComments(files, base, snap);
};

const writeIssueThreads = (
	files: FileMap,
	base: string,
	snap: SnapshotData,
): void => {
	const commentsByIssue = groupBy(snap.issueComments, (c) =>
		extractNumber(c.issue_url),
	);
	snap.issues.forEach((issue) => {
		const thread = buildIssueThread(
			issue,
			commentsByIssue[String(issue.number)] ?? [],
			snap.summary.full_name,
		);
		write(files, base, `llm/issues/${issue.number}.thread.jsonl`, thread);
	});
};

const writePullThreads = (
	files: FileMap,
	base: string,
	snap: SnapshotData,
): void => {
	const reviewsByPr = groupBy(snap.reviews, (r) =>
		extractNumber(r.pull_request_url),
	);
	const reviewCommentsByPr = groupBy(snap.reviewComments, (rc) =>
		extractNumber(rc.pull_request_url),
	);
	snap.pulls.forEach((pr) => {
		const thread = buildPullThread(
			pr,
			reviewsByPr[String(pr.number)] ?? [],
			reviewCommentsByPr[String(pr.number)] ?? [],
			snap.summary.full_name,
		);
		write(files, base, `llm/pulls/${pr.number}.thread.jsonl`, thread);
	});
};

const writeSyncState = (
	files: FileMap,
	base: string,
	snap: SnapshotData,
): void => {
	const syncState = {
		repo: snap.summary.full_name,
		synced_at: new Date().toISOString(),
		counts: {
			issues: snap.issues.length,
			pulls: snap.pulls.length,
			issueComments: snap.issueComments.length,
			reviewComments: snap.reviewComments.length,
			reviews: snap.reviews.length,
			releases: snap.releases.length,
		},
	};
	write(files, base, "sync_state.json", JSON.stringify(syncState, null, 2));
};

export const buildZip = (snap: SnapshotData): Effect.Effect<Blob> =>
	Effect.sync(() => {
		const base = ".gitmeta";
		const files: FileMap = {};

		writeRaw(files, base, snap);
		writeIssueThreads(files, base, snap);
		writePullThreads(files, base, snap);
		write(files, base, "archive/gitmeta.txt", buildArchiveText(snap));
		writeSyncState(files, base, snap);

		const zipped = zipSync(files, { level: 6 });
		const normalized = new Uint8Array(zipped);
		return new Blob([normalized.buffer], { type: "application/zip" });
	});
