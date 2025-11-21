import React from "react";
import type { IngestOptions } from "../core/ingest/plan";

interface OptionCheckboxProps {
	readonly checked: boolean;
	readonly label: string;
	readonly onToggle: () => void;
}

const OptionCheckbox = ({ checked, label, onToggle }: OptionCheckboxProps) => (
	<label className="check-pill">
		<input type="checkbox" checked={checked} onChange={onToggle} />
		<span>{label}</span>
	</label>
);

interface OptionsGridProps {
	readonly options: IngestOptions;
	readonly toggleOption: (key: keyof IngestOptions) => void;
}

const OptionsGrid = ({ options, toggleOption }: OptionsGridProps) => (
	<div className="ingest-box__checks">
		<OptionCheckbox
			checked={options.includeIssues}
			label="Issues"
			onToggle={() => {
				toggleOption("includeIssues");
			}}
		/>
		<OptionCheckbox
			checked={options.includePulls}
			label="Pull Requests"
			onToggle={() => {
				toggleOption("includePulls");
			}}
		/>
		<OptionCheckbox
			checked={options.includeComments}
			label="Comments"
			onToggle={() => {
				toggleOption("includeComments");
			}}
		/>
		<OptionCheckbox
			checked={options.includeReviews}
			label="Reviews"
			onToggle={() => {
				toggleOption("includeReviews");
			}}
		/>
		<OptionCheckbox
			checked={options.includeReleases}
			label="Releases"
			onToggle={() => {
				toggleOption("includeReleases");
			}}
		/>
	</div>
);

interface TokenInputProps {
	readonly token: string;
	readonly onChange: (value: string) => void;
}

const TokenInput = ({ token, onChange }: TokenInputProps) => (
	<TokenInputInner token={token} onChange={onChange} />
);

const toTokenList = (value: string): ReadonlyArray<string> =>
	value
		.split(/[\s,]+/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0);

const maskToken = (value: string): string => {
	const prefix = value.slice(0, 6);
	const maskedLength = Math.max(value.length - 6, 3);
	return `${prefix}${"•".repeat(maskedLength)}`;
};

const TokenInputInner = ({ token, onChange }: TokenInputProps) => {
	const tokens = toTokenList(token);
	const [draft, setDraft] = React.useState("");

	const addToken = () => {
		const next = draft.trim();
		if (next.length === 0) return;
		const merged = [...tokens, next].join("\n");
		onChange(merged);
		setDraft("");
	};

	const removeToken = (value: string) => {
		const filtered = tokens.filter((t) => t !== value);
		onChange(filtered.join("\n"));
	};

	return (
		<div className="ingest-box__token">
			<TokenLabel />
			<AddTokenRow draft={draft} onDraftChange={setDraft} onAdd={addToken} />
			<TokenList tokens={tokens} onRemove={removeToken} />
			<p className="ingest-box__hint">
				Stored in-browser; first working token will be used.
			</p>
		</div>
	);
};

const TokenLabel = () => (
	<label htmlFor="token-input">
		GitHub tokens{" "}
		<a
			href="https://github.com/settings/tokens/new?description=gitmeta&scopes=repo"
			target="_blank"
			rel="noreferrer"
		>
			Create token
		</a>
	</label>
);

interface AddTokenRowProps {
	readonly draft: string;
	readonly onDraftChange: (value: string) => void;
	readonly onAdd: () => void;
}

const AddTokenRow = ({ draft, onDraftChange, onAdd }: AddTokenRowProps) => (
	<div className="token-add-row">
		<input
			id="token-input"
			className="ingest-box__input ingest-box__input--token-line"
			type="password"
			placeholder="ghp_xxx..."
			value={draft}
			onChange={(event) => {
				onDraftChange(event.target.value);
			}}
		/>
		<button
			type="button"
			className="token-add-btn"
			onClick={onAdd}
			disabled={draft.trim().length === 0}
		>
			+
		</button>
	</div>
);

interface TokenListProps {
	readonly tokens: ReadonlyArray<string>;
	readonly onRemove: (value: string) => void;
}

const TokenList = ({ tokens, onRemove }: TokenListProps) =>
	tokens.length > 0 ? (
		<ul className="token-list">
			{tokens.map((t) => (
				<li key={t} className="token-list__item">
					<span className="token-mask">{maskToken(t)}</span>
					<button
						type="button"
						className="token-remove-btn"
						onClick={() => {
							onRemove(t);
						}}
					>
						×
					</button>
				</li>
			))}
		</ul>
	) : null;

interface OutputDirInputProps {
	readonly outputDir: string;
	readonly onChange: (value: string) => void;
}

const OutputDirInput = ({ outputDir, onChange }: OutputDirInputProps) => (
	<div className="ingest-box__output">
		<label htmlFor="output-dir">Output folder</label>
		<input
			id="output-dir"
			className="ingest-box__input ingest-box__input--narrow"
			value={outputDir}
			onChange={(event) => {
				onChange(event.target.value);
			}}
		/>
		<p className="ingest-box__hint">Defaults to .gitmeta next to the code.</p>
	</div>
);

interface IngestFormProps {
	readonly repoInput: string;
	readonly options: IngestOptions;
	readonly token: string;
	readonly submitting: boolean;
	readonly onRepoChange: (value: string) => void;
	readonly onToggleOption: (key: keyof IngestOptions) => void;
	readonly onOutputDirChange: (value: string) => void;
	readonly onTokenChange: (value: string) => void;
	readonly onSubmit: React.FormEventHandler<HTMLFormElement>;
	readonly statusSlot: React.ReactNode;
}

export const IngestForm = ({
	repoInput,
	options,
	token,
	submitting,
	onRepoChange,
	onToggleOption,
	onOutputDirChange,
	onTokenChange,
	onSubmit,
	statusSlot,
}: IngestFormProps) => (
	<section className="ingest-box">
		<form className="ingest-box__form" onSubmit={onSubmit}>
			<div className="ingest-box__input-row">
				<input
					id="repo-input"
					className="ingest-box__input"
					placeholder="https://github.com/owner/repo"
					value={repoInput}
					onChange={(event) => {
						onRepoChange(event.target.value);
					}}
				/>
				<button
					className="ingest-box__submit"
					type="submit"
					disabled={submitting}
				>
					{submitting ? "Ingest…" : "Ingest"}
				</button>
			</div>
			<div className="ingest-box__options">
				<OptionsGrid options={options} toggleOption={onToggleOption} />
				<OutputDirInput
					outputDir={options.outputDir}
					onChange={onOutputDirChange}
				/>
			</div>
			<TokenInput token={token} onChange={onTokenChange} />
		</form>
		{statusSlot}
	</section>
);
