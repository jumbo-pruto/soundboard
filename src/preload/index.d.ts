import type { Api } from './index'

declare global {
  interface Window {
    api: Api
  }

  interface HTMLMediaElement {
    setSinkId(sinkId: string): Promise<void>
    readonly sinkId: string
  }
}

export {}
