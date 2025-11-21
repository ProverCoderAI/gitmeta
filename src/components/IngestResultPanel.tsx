import type { IngestPlan } from "../core/ingest/plan";

const DirectoryMock = ({ plan }: { readonly plan: IngestPlan }) => (
	<div className="result-card">
		<div className="result-card__header">
			<p>Directory structure</p>
			<button
				type="button"
				className="copy-btn"
				onClick={() => {
					void navigator.clipboard.writeText(
						`${plan.outputDir}/\n├─ raw/\n├─ llm/\n└─ manifest.json`,
					);
				}}
			>
				Copy
			</button>
		</div>
		<pre className="result-card__pre">
			{`${plan.outputDir}/
├─ raw/
├─ llm/
└─ manifest.json`}
		</pre>
	</div>
);

const SummaryMock = ({
	plan,
	archiveText,
}: {
	readonly plan: IngestPlan;
	readonly archiveText: string;
}) => (
	<div className="result-card">
		<div className="result-card__header">
			<p>Summary</p>
			<button
				type="button"
				className="copy-btn"
				onClick={() => {
					void navigator.clipboard.writeText(archiveText);
				}}
			>
				Copy all
			</button>
		</div>
		<pre className="result-card__pre">
			{`Repository: ${plan.target.owner}/${plan.target.name}
Mode: GitHub REST API
Command: ${plan.cliCommand}`}
		</pre>
	</div>
);

interface ResultPanelProps {
	readonly plan: IngestPlan;
	readonly archiveText: string;
	readonly gitmetaUrl: string;
	readonly zipUrl: string;
}

export const ResultPanel = ({
	plan,
	archiveText,
	gitmetaUrl,
	zipUrl,
}: ResultPanelProps) => (
	<section className="result">
		<div className="result__actions">
			<SummaryMock plan={plan} archiveText={archiveText} />
			<DirectoryMock plan={plan} />
		</div>
		<div className="result-card">
			<div className="result-card__header">
				<p>Archive</p>
				<div className="result-card__downloads">
					<a
						className="copy-btn"
						href={gitmetaUrl}
						download={`${plan.target.name}-gitmeta.txt`}
					>
						gitmeta.txt
					</a>
					<a
						className="copy-btn"
						href={zipUrl}
						download={`${plan.target.name}-gitmeta.zip`}
					>
						.gitmeta.zip
					</a>
				</div>
			</div>
			<pre className="result-card__pre result-card__pre--scroll">
				{archiveText}
			</pre>
		</div>
	</section>
);
