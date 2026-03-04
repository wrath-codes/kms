/**
 * Mock vscode module for unit tests
 * Provides stub implementations of VS Code APIs
 */

export const version = "1.90.0";

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};

export enum ViewColumn {
  One = 1,
  Two = 2,
  Three = 3,
}

export class Disposable {
  static from(...disposables: any[]) {
    return new Disposable();
  }
  dispose() {}
}

export class EventEmitter {
  private listeners: any[] = [];

  get event() {
    return (listener: any) => {
      this.listeners.push(listener);
      return new Disposable();
    };
  }

  fire(value: any) {
    this.listeners.forEach((l) => l(value));
  }
}

export class URI {
  constructor(public value: string) {}
  static file(path: string) {
    return new URI(path);
  }
}

export const QuickInputButtons = {
  Back: { iconPath: URI.file(""), tooltip: "Back" },
};

export namespace workspace {
  export const onDidChangeConfiguration = new EventEmitter().event;
  export const workspaceFolders: any[] = [];

  export const _configStore: Record<string, any> = {};

  export function getConfiguration(section?: string) {
    return {
      get: (key: string, defaultValue?: any) => {
        const fullKey = section ? `${section}.${key}` : key;
        return fullKey in _configStore ? _configStore[fullKey] : defaultValue;
      },
      update: async () => {},
    };
  }
}

export namespace commands {
  export async function registerCommand(id: string, callback: any) {
    return new Disposable();
  }

  export async function executeCommand(id: string, ...args: any[]) {
    return undefined;
  }
}

export namespace window {
  export async function showQuickPick(items: any[], options?: any) {
    return undefined;
  }

  export async function showInputBox(options?: any) {
    return undefined;
  }

  export async function showInformationMessage(msg: string) {
    return undefined;
  }

  export async function showWarningMessage(msg: string) {
    return undefined;
  }

  export let lastQuickPick: ReturnType<typeof createQuickPick> | null = null;

  export function createQuickPick() {
    const onDidAcceptEmitter = new EventEmitter();
    const onDidHideEmitter = new EventEmitter();
    const onDidChangeValueEmitter = new EventEmitter();
    const qp = {
      show: () => {},
      hide: () => {},
      dispose: () => {},
      onDidAccept: onDidAcceptEmitter.event,
      onDidHide: onDidHideEmitter.event,
      onDidChangeValue: onDidChangeValueEmitter.event,
      items: [] as any[],
      selectedItems: [] as any[],
      value: "",
      placeholder: "",
      title: undefined as string | undefined,
      matchOnDescription: false,
      matchOnDetail: false,
      _onDidAcceptEmitter: onDidAcceptEmitter,
      _onDidHideEmitter: onDidHideEmitter,
      _onDidChangeValueEmitter: onDidChangeValueEmitter,
    };
    lastQuickPick = qp;
    return qp;
  }

  export const onDidChangeActiveTextEditor = new EventEmitter().event;
}

export namespace languages {
  export function registerCodeActionsProvider(selector: any, provider: any) {
    return new Disposable();
  }
}

export interface ExtensionContext {
  extensionMode: ExtensionMode;
  extensionPath: string;
  globalState: any;
  workspaceState: any;
  subscriptions: Disposable[];
}
