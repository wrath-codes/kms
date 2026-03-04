import { Brand, Data } from "effect"

// ---------------------------------------------------------------------------
// Branded Types
// ---------------------------------------------------------------------------

export type CommandId = string & Brand.Brand<"CommandId">
export const CommandId = Brand.nominal<CommandId>()

// ---------------------------------------------------------------------------
// Value Types
// ---------------------------------------------------------------------------

export class Command extends Data.Class<{
  readonly id: CommandId
  readonly label: string
  readonly description: string | undefined
  readonly category: string | undefined
  readonly keybinding: string | undefined
  readonly when: string | undefined
}> {}

export class CommandGroup extends Data.Class<{
  readonly key: string
  readonly name: string
  readonly commands: readonly Command[]
}> {}

export class RegistrySnapshot extends Data.Class<{
  readonly version: number
  readonly commands: readonly Command[]
  readonly groups: readonly CommandGroup[]
  readonly updatedAt: number
}> {}

export class MatchRange extends Data.Class<{
  readonly start: number
  readonly end: number
}> {}

export class SearchResult extends Data.Class<{
  readonly command: Command
  readonly score: number
  readonly matches: readonly MatchRange[]
}> {}

export class RenderItem extends Data.Class<{
  readonly label: string
  readonly description: string | undefined
  readonly detail: string | undefined
  readonly command: Command
}> {}

export class RenderModel extends Data.Class<{
  readonly items: readonly RenderItem[]
  readonly version: number
  readonly query: string
}> {}

// ---------------------------------------------------------------------------
// Context Types
// ---------------------------------------------------------------------------

export type ContextValue = string | number | boolean

export class ContextEntry extends Data.Class<{
  readonly key: string
  readonly value: ContextValue
}> {}

// ---------------------------------------------------------------------------
// Configuration Types
// ---------------------------------------------------------------------------

export class ConfigSnapshot extends Data.Class<{
  readonly values: ReadonlyMap<string, unknown>
  readonly version: number
}> {}

// ---------------------------------------------------------------------------
// Dispatch Actions (Tagged Enum)
// ---------------------------------------------------------------------------

export type DispatchAction = Data.TaggedEnum<{
  SetQuery: { readonly query: string }
  SelectItem: { readonly command: Command }
  Navigate: { readonly group: CommandGroup }
  GoBack: {}
  Close: {}
}>

export const DispatchAction = Data.taggedEnum<DispatchAction>()

// ---------------------------------------------------------------------------
// Which-Key Binding Tree
// ---------------------------------------------------------------------------

export type BindingNode = BindingGroup | BindingLeaf

export class BindingGroup extends Data.Class<{
  readonly key: string
  readonly name: string
  readonly icon: string | undefined
  readonly bindings: readonly BindingNode[]
}> {}

export class BindingLeaf extends Data.Class<{
  readonly key: string
  readonly name: string
  readonly icon: string | undefined
  readonly command: string
  readonly args: readonly unknown[] | undefined
}> {}
