import { Layer } from "effect"
import { ConfigServiceLive } from "../services/ConfigService"
import { ContextServiceLive } from "../services/ContextService"
import { RegistryServiceLive } from "../services/RegistryService"
import { SearchServiceLive } from "../services/SearchService"
import { CommandServiceLive } from "../services/CommandService"
import { RenderModelServiceLive } from "../services/RenderModelService"
import { DispatchQueueServiceLive } from "../services/DispatchQueue"
import { IconServiceLive } from "../services/IconService"
import { WhichKeyMenuLive } from "../ui/whichKeyMenu"
import { IconPickerUILive } from "../ui/iconPicker"

const BaseLayer = Layer.mergeAll(
  ContextServiceLive,
  RegistryServiceLive,
  CommandServiceLive,
  RenderModelServiceLive,
  DispatchQueueServiceLive,
  IconServiceLive,
)

const DependentLayer = Layer.mergeAll(
  ConfigServiceLive,
  SearchServiceLive,
  WhichKeyMenuLive,
  IconPickerUILive,
)

export const MainLayer = DependentLayer.pipe(Layer.provideMerge(BaseLayer))
