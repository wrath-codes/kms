import { Layer } from "effect"
import { ConfigServiceLive } from "../services/ConfigService"
import { ContextServiceLive } from "../services/ContextService"
import { RegistryServiceLive } from "../services/RegistryService"
import { SearchServiceLive } from "../services/SearchService"
import { CommandServiceLive } from "../services/CommandService"
import { RenderModelServiceLive } from "../services/RenderModelService"
import { DispatchQueueServiceLive } from "../services/DispatchQueue"
import { WhichKeyMenuLive } from "../ui/whichKeyMenu"

const ServicesLayer = Layer.mergeAll(
  ConfigServiceLive,
  ContextServiceLive,
  RegistryServiceLive,
  CommandServiceLive,
  RenderModelServiceLive,
  DispatchQueueServiceLive,
)

const SearchLayer = SearchServiceLive.pipe(Layer.provide(RegistryServiceLive))

const CoreLayer = Layer.mergeAll(ServicesLayer, SearchLayer)

const MenuDeps = Layer.mergeAll(ContextServiceLive, CommandServiceLive)

export const MainLayer = Layer.mergeAll(
  CoreLayer,
  WhichKeyMenuLive.pipe(Layer.provide(MenuDeps)),
)
