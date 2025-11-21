export interface RepoTarget {
	readonly owner: string;
	readonly repo: string;
}

export interface RepoSummary {
	readonly full_name: string;
	readonly description: string | null;
	readonly default_branch: string;
	readonly pushed_at: string | null;
	readonly stargazers_count: number;
	readonly forks_count: number;
	readonly open_issues_count: number;
}

export interface Label {
	readonly name: string;
}

export interface Milestone {
	readonly title: string;
}

export interface User {
	readonly login: string;
}

export interface PullRequestReference {
	readonly url?: string;
	readonly html_url?: string;
}

interface BaseRepoItem {
	readonly number: number;
	readonly title: string;
	readonly state: string;
	readonly user: User;
	readonly created_at: string;
	readonly closed_at: string | null;
	readonly body: string | null;
	readonly labels?: ReadonlyArray<Label>;
	readonly milestone?: Milestone | null;
	readonly assignees?: ReadonlyArray<User>;
}

export interface Issue extends BaseRepoItem {
	readonly pull_request?: PullRequestReference | null;
}

export interface PullRequest extends BaseRepoItem {
	readonly merged_at: string | null;
}

export interface IssueComment {
	readonly id: number;
	readonly user: User;
	readonly body: string;
	readonly created_at: string;
	readonly updated_at: string;
	readonly issue_url: string;
}

export interface Release {
	readonly id: number;
	readonly name: string | null;
	readonly tag_name: string;
	readonly created_at: string | null;
	readonly published_at: string | null;
	readonly body: string | null;
}

export interface PullReview {
	readonly id: number;
	readonly user: User | null;
	readonly body: string | null;
	readonly state: string;
	readonly submitted_at: string | null;
	readonly pull_request_url: string;
}

export interface PullReviewComment {
	readonly id: number;
	readonly user: User;
	readonly body: string;
	readonly created_at: string;
	readonly updated_at: string;
	readonly pull_request_url: string;
}

export interface SnapshotData {
	readonly summary: RepoSummary;
	readonly issues: ReadonlyArray<Issue>;
	readonly pulls: ReadonlyArray<PullRequest>;
	readonly issueComments: ReadonlyArray<IssueComment>;
	readonly releases: ReadonlyArray<Release>;
	readonly reviewComments: ReadonlyArray<PullReviewComment>;
	readonly reviews: ReadonlyArray<PullReview>;
}

export interface RateLimitError {
	readonly _tag: "RateLimit";
	readonly message: string;
	readonly resetAt?: number;
}
