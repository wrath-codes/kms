import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { CommandService, CommandServiceLive } from "../../services/CommandService"

it.layer(CommandServiceLive)("CommandService", (it) => {
  it.effect("executes a command", () =>
    Effect.gen(function* () {
      const cmd = yield* CommandService
      const result = yield* cmd.execute("noop.command")
      expect(result).toBe(undefined)
    })
  )

  it.effect("executes exclusive command", () =>
    Effect.gen(function* () {
      const cmd = yield* CommandService
      const result = yield* cmd.executeExclusive("noop.command")
      expect(result).toBe(undefined)
    })
  )

  it.effect("handles multiple concurrent commands", () =>
    Effect.gen(function* () {
      const cmd = yield* CommandService
      const results = yield* Effect.all([
        cmd.execute("noop.1"),
        cmd.execute("noop.2"),
        cmd.execute("noop.3"),
        cmd.execute("noop.4"),
      ])
      expect(results).toEqual([undefined, undefined, undefined, undefined])
    })
  )
})
