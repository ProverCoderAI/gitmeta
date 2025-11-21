import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// CHANGE: Верифицируем наличие корневого контейнера перед монтированием приложения
// WHY: Удаляем небезопасное non-null выражение и формализуем предусловие монтирования
// QUOTE(ТЗ): "Ошибки: типизированы в сигнатурах функций, не runtime exceptions"
// REF: User Message 3
// SOURCE: https://react.dev/reference/react-dom/client/createRoot#parameters
// FORMAT THEOREM: ∀ domRoot ∈ Document: domRoot ≠ null → render(App, domRoot)
// PURITY: SHELL
// EFFECT: Effect<void, DOMException | Error, Document>
// INVARIANT: rootElementFound ⇔ renderExecutes
// COMPLEXITY: O(1)/O(1)
const rootElement = document.getElementById("root");

if (rootElement === null) {
	throw new Error("Unable to find #root container for rendering.");
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
