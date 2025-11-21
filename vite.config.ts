import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { componentTagger } from 'lovable-tagger'

// CHANGE: enable lovable-tagger plugin in development for DOM-to-React traceability
// WHY: instrumentation adds data attributes linking rendered nodes to component sources
// QUOTE(ТЗ): "vite плагин который добавляет во фронтенд мета информацию об вашем React коде"
// REF: user request about lovable-tagger integration
// SOURCE: https://www.npmjs.com/package/lovable-tagger
// FORMAT THEOREM: forall node in DOM: instrumented(node) -> traceable_to_component(node)
// PURITY: SHELL
// EFFECT: Effect<PluginOption[], never, "vite-config">
// INVARIANT: mode === "development" -> instrumentationEnabled(mode)
// COMPLEXITY: O(1)/O(1)
const buildPlugins = (mode: string): PluginOption[] => {
  const instrumentationEnabled = mode === 'development'
  const candidates: Array<PluginOption | null> = [
    react(),
    instrumentationEnabled ? componentTagger() : null,
  ]

  return candidates.filter(
    (plugin): plugin is PluginOption => plugin !== null,
  )
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: buildPlugins(mode),
}))
