import { Layer } from "effect"
import { ConfigServiceLive } from "../services/ConfigService"
import { ContextServiceLive } from "../services/ContextService"
import { RegistryServiceAdvancedLive } from "../services/RegistryServiceAdvanced"
import { SearchServiceLive } from "../services/SearchService"
import { CommandServiceLive } from "../services/CommandService"
import { RenderModelServiceLive } from "../services/RenderModelService"
import { DispatchQueueServiceLive } from "../services/DispatchQueue"
import { WhichKeyMenuLive } from "../ui/whichKeyMenu"

const ServicesLayer = Layer.mergeAll(
  ConfigServiceLive,
  ContextServiceLive,
  RegistryServiceAdvancedLive,
  CommandServiceLive,
  RenderModelServiceLive,
  DispatchQueueServiceLive,
)

const SearchLayer = SearchServiceLive.pipe(Layer.provide(RegistryServiceAdvancedLive))

const CoreLayer = Layer.mergeAll(ServicesLayer, SearchLayer)

export const MainLayerAdvanced = Layer.mergeAll(
  CoreLayer,
  WhichKeyMenuLive.pipe(Layer.provide(CoreLayer)),
)
