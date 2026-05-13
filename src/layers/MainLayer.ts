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

const ServicesLayer = Layer.mergeAll(
  ConfigServiceLive,
  ContextServiceLive,
  RegistryServiceLive,
  CommandServiceLive,
  RenderModelServiceLive,
  DispatchQueueServiceLive,
  IconServiceLive,
)

const SearchLayer = SearchServiceLive.pipe(Layer.provide(RegistryServiceLive))

const CoreLayer = Layer.mergeAll(ServicesLayer, SearchLayer)

const MenuDeps = Layer.mergeAll(ContextServiceLive, CommandServiceLive, IconServiceLive)

const PickerDeps = Layer.mergeAll(IconServiceLive)

export const MainLayer = Layer.mergeAll(
  CoreLayer,
  WhichKeyMenuLive.pipe(Layer.provide(MenuDeps)),
  IconPickerUILive.pipe(Layer.provide(PickerDeps)),
)
