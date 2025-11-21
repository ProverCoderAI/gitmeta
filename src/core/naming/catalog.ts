import * as Schema from "@effect/schema/Schema";
import { pipe } from "effect/Function";

import type {
	CandidateCatalog,
	CandidateEvaluation,
	CandidateScore,
} from "./candidate";
import { CandidateCatalogSchema } from "./candidate";

const makeEvaluation = (
	clarity: CandidateScore,
	distinctiveness: CandidateScore,
	llmAffinity: CandidateScore,
): CandidateEvaluation => ({ clarity, distinctiveness, llmAffinity });

const candidateCatalogLiteral = [
	{
		id: "gitlore",
		label: "GitLore",
		shortSense: "Лоры репозитория: вся история и контекст в одном слепке.",
		description:
			"Название подчёркивает легенды и нарративы коммитов, issues и PR, превращая сырую активность в понятный для LLM сюжет.",
		theme: "Lore",
		tier: "Flagship",
		slogan: "GitLore формализует летопись репозитория для моделей.",
		keys: [
			"Фокус на историческом нарративе репозитория",
			"Удобно произносится и сразу намекает на контекст",
		] as const,
		samplePrompt:
			"Прогоняю репу через GitLore, чтобы модель увидела всю историю обсуждений.",
		evaluation: makeEvaluation(4, 5, 5),
	},
	{
		id: "repolore",
		label: "RepoLore",
		shortSense: "Нейтральный аналог GitLore: лоры любых репозиториев.",
		description:
			"RepoLore уходит от сильной привязки к Git и подходит для GitLab, Codeberg или внутренних хостингов, сохраняя идею 'историй репозитория'.",
		theme: "Lore",
		tier: "Flagship",
		slogan: "RepoLore собирает коллективную память проекта в язык LLM.",
		keys: [
			"Подходит для мульти-хостинговых сценариев",
			"Сохраняет образ рассказов/лоров",
		] as const,
		samplePrompt:
			"RepoLore делает слепок обсуждений репозитория и отдаёт LLM-формат.",
		evaluation: makeEvaluation(5, 4, 5),
	},
	{
		id: "metaingest",
		label: "MetaIngest",
		shortSense: "Прямо говорит про ingest метаданных issues/PR.",
		description:
			"Название подчёркивает pipeline: сервис забирает всю мета-информацию и переводит её в консистентный LLM-контекст, будто 'gitingest для дискуссий'.",
		theme: "Meta",
		tier: "Flagship",
		slogan: "MetaIngest — ingest метаданных репозитория для LLM.",
		keys: [
			"Можно быстро объяснить через аналогию с gitingest",
			"Хорошо описывает feature-set через одно слово",
		] as const,
		samplePrompt:
			"MetaIngest забирает все issues и pull requests и выдаёт единый поток для моделей.",
		evaluation: makeEvaluation(5, 4, 4),
	},
	{
		id: "gitmeta",
		label: "GitMeta",
		shortSense: "Максимально прямое: git + meta-информация.",
		description:
			"GitMeta звучит сразу функционально и честно: API, который возвращает issues, PR и комментарии как контекст. Хорошо для официального сервиса.",
		theme: "Meta",
		tier: "Flagship",
		slogan: "GitMeta API отдаёт LLM-контекст репозитория.",
		keys: [
			"Понятно любому инженеру",
			"Соединяет важные слова 'git' и 'meta'",
		] as const,
		samplePrompt:
			"GitMeta собирает issues, PR и комментарии в единый JSON для LLM.",
		evaluation: makeEvaluation(5, 3, 5),
	},
	{
		id: "repomind",
		label: "RepoMind",
		shortSense: "'Ум проекта': про мышление репозитория.",
		description:
			"RepoMind подчеркивает, что речь не о коде, а о коллективном мышлении вокруг него: issues, треды, решения. Очень созвучно LLM-контекстам.",
		theme: "Mind",
		tier: "Flagship",
		slogan: "RepoMind — мысли репозитория в формате LLM.",
		keys: [
			"Эмоциональный и запоминающийся",
			"Подходит, когда важно подчеркнуть 'разум' команды",
		] as const,
		samplePrompt: "Скормим RepoMind этой модели и покажем весь ход обсуждений.",
		evaluation: makeEvaluation(4, 5, 5),
	},
	{
		id: "issuelore",
		label: "IssueLore",
		shortSense: "Акцент на обсуждениях и issue-тредах.",
		description:
			"Узкое, но точное имя для сервиса, который вытягивает лоры именно из issue-трекера. Полезно для отдельного модуля или тарифного плана.",
		theme: "Lore",
		tier: "Reserve",
		slogan: "IssueLore собирает нарративы обсуждений.",
		keys: [
			"Покрывает нишу issue-centric аналитики",
			"Сильное позиционирование на обсуждения",
		] as const,
		samplePrompt:
			"IssueLore агрегирует ветки обсуждений, чтобы LLM видела аргументы сторон.",
		evaluation: makeEvaluation(4, 4, 4),
	},
	{
		id: "threadforge",
		label: "ThreadForge",
		shortSense: "Ковка тредов в единый контекст.",
		description:
			"Название задаёт активный процесс: мы 'куем' разрозненные обсуждения в цельный артефакт для моделей. Подходит для обработки комментариев.",
		theme: "Forge",
		tier: "Reserve",
		slogan: "ThreadForge сводит обсуждения в единый артефакт.",
		keys: [
			"Динамичное и технологичное",
			"Хорошо звучит в англоязычной коммуникации",
		] as const,
		samplePrompt:
			"ThreadForge собирает pull request threads и готовит LLM ready пакет.",
		evaluation: makeEvaluation(3, 5, 4),
	},
	{
		id: "gitcanon",
		label: "GitCanon",
		shortSense: "Каноничная история репозитория.",
		description:
			"GitCanon делает акцент на том, что сервис выдаёт 'канон' — проверенную версию событий. Отлично для документации и регламентов.",
		theme: "Canon",
		tier: "Reserve",
		slogan: "GitCanon фиксирует канон обсуждений.",
		keys: ["Подчёркивает достоверность", "Звучит авторитетно"] as const,
		samplePrompt:
			"GitCanon выдаёт каноничную историю PR, чтобы исключить расхождения.",
		evaluation: makeEvaluation(4, 4, 4),
	},
	{
		id: "contextrepo",
		label: "ContextRepo",
		shortSense: "Прямо говорит про репозиторий с расширенным контекстом.",
		description:
			"ContextRepo указывает на дополненные данные вокруг кода: обсуждения, решения, связи. Полезно как umbrella-бренд или internal codename.",
		theme: "Context",
		tier: "Reserve",
		slogan: "ContextRepo добавляет обсуждения к коду.",
		keys: [
			"Прозрачное позиционирование",
			"Легко международно произносится",
		] as const,
		samplePrompt:
			"ContextRepo формирует расширенный контекст и возвращает JSON для LLM.",
		evaluation: makeEvaluation(5, 3, 4),
	},
] as const satisfies CandidateCatalog;

const decodedCatalog: CandidateCatalog = pipe(
	candidateCatalogLiteral,
	Schema.decodeUnknownSync(CandidateCatalogSchema),
);

// CHANGE: Предоставить неизменяемый каталог нейминга из пользовательского брифа
// WHY: Требуется формальное ядро с проверяемыми данными, прежде чем строить UI
// QUOTE(ТЗ): "FUNCTIONAL CORE, IMPERATIVE SHELL"
// REF: user-message-1
// SOURCE: https://en.wikipedia.org/wiki/Pure_function ("the function return values are identical for identical arguments ... referential transparency")
// FORMAT THEOREM: ∀c ∈ Catalog: decoded(c) → Schema.valid(c)
// PURITY: CORE
// EFFECT: None (pure data access)
// INVARIANT: ∀c ∈ Catalog: |keys(c)| ≥ 1 ∧ score ∈ [1,5]
// COMPLEXITY: O(n)/O(1)
export const getCandidateCatalog = (): CandidateCatalog => decodedCatalog;
