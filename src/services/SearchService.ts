import { Context, Effect, Layer } from "effect"
import { Command, MatchRange, SearchResult } from "../domain/types"
import { tokenize, RegistryService } from "./RegistryService"

// ---------------------------------------------------------------------------
// Service Interface
// ---------------------------------------------------------------------------

export class SearchService extends Context.Tag("SearchService")<
  SearchService,
  {
    readonly search: (query: string) => Effect.Effect<readonly SearchResult[]>
  }
>() {}

// ---------------------------------------------------------------------------
// Scoring (pure, exported for testing)
// ---------------------------------------------------------------------------

export const scoreMatch = (query: string, command: Command): SearchResult | null => {
  if (query.length === 0) {
    return new SearchResult({ command, score: 0, matches: [] })
  }

  const queryTokens = tokenize(query)
  const labelTokens = tokenize(command.label)
  const idTokens = tokenize(command.id)
  const allTokens = [...labelTokens, ...idTokens]

  let totalScore = 0
  const matches: MatchRange[] = []

  for (const qt of queryTokens) {
    let bestScore = 0
    for (const ct of allTokens) {
      if (ct === qt) {
        bestScore = Math.max(bestScore, 1.0)
      } else if (ct.startsWith(qt)) {
        bestScore = Math.max(bestScore, 0.7)
      } else if (ct.includes(qt)) {
        bestScore = Math.max(bestScore, 0.4)
      }
    }
    if (bestScore === 0) return null
    totalScore += bestScore
  }

  const lowerLabel = command.label.toLowerCase()
  for (const qt of queryTokens) {
    const idx = lowerLabel.indexOf(qt)
    if (idx >= 0) {
      matches.push(new MatchRange({ start: idx, end: idx + qt.length }))
    }
  }

  return new SearchResult({
    command,
    score: totalScore / queryTokens.length,
    matches,
  })
}

// ---------------------------------------------------------------------------
// Live Implementation
// ---------------------------------------------------------------------------

export const SearchServiceLive = Layer.effect(
  SearchService,
  Effect.gen(function* () {
    const registry = yield* RegistryService

    return {
      search: (query: string) =>
        Effect.gen(function* () {
          const snap = yield* registry.snapshot
          const results: SearchResult[] = []

          for (const cmd of snap.commands) {
            const result = scoreMatch(query, cmd)
            if (result !== null) {
              results.push(result)
            }
          }

          for (const group of snap.groups) {
            for (const cmd of group.commands) {
              const result = scoreMatch(query, cmd)
              if (result !== null) {
                results.push(result)
              }
            }
          }

          results.sort((a, b) => b.score - a.score)
          return results as readonly SearchResult[]
        }).pipe(Effect.withSpan("SearchService.search")),
    }
  })
)
