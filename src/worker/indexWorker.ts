import { parentPort } from "worker_threads"
import { buildIndex, searchIndex, type InvertedIndex } from "../services/InvertedIndex"

// RPC message types
interface BuildMessage {
  type: "build"
  id: number
  commands: { id: string; label: string }[]
}

interface SearchMessage {
  type: "search"
  id: number
  query: string
  topK: number
}

interface DisposeMessage {
  type: "dispose"
  id: number
}

type WorkerMessage = BuildMessage | SearchMessage | DisposeMessage

interface WorkerResponse {
  id: number
  type: "result" | "error"
  data?: any
  error?: string
}

let index: InvertedIndex | null = null

parentPort?.on("message", (msg: WorkerMessage) => {
  try {
    switch (msg.type) {
      case "build": {
        index = buildIndex(msg.commands)
        const response: WorkerResponse = {
          id: msg.id,
          type: "result",
          data: { documentCount: index.documentCount, avgDocLength: index.avgDocLength },
        }
        parentPort?.postMessage(response)
        break
      }
      case "search": {
        if (!index) {
          parentPort?.postMessage({ id: msg.id, type: "error", error: "Index not built" } as WorkerResponse)
          return
        }
        const hits = searchIndex(index, msg.query, msg.topK)
        parentPort?.postMessage({ id: msg.id, type: "result", data: hits } as WorkerResponse)
        break
      }
      case "dispose": {
        index = null
        parentPort?.postMessage({ id: msg.id, type: "result" } as WorkerResponse)
        break
      }
    }
  } catch (e: any) {
    parentPort?.postMessage({ id: msg.id, type: "error", error: e.message ?? String(e) } as WorkerResponse)
  }
})
