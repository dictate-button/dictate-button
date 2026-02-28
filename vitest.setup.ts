// Mock global variables that the component expects
globalThis.__APP_VERSION__ = 'test-version'

// Mock WebSocket for tests
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState: number = MockWebSocket.CONNECTING
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  private sentMessages: ArrayBuffer[] = []

  constructor(url: string) {
    this.url = url
    this.readyState = MockWebSocket.CONNECTING
    this.sentMessages = []
    // Simulate connection opening after a tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 0)
  }

  // Helper to manually trigger connection open (for tests using fake timers)
  open(): void {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  send(data: ArrayBuffer): void {
    this.sentMessages.push(data)
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSING
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED
      this.onclose?.({ code: 1000, reason: '', wasClean: true } as CloseEvent)
    }, 0)
  }

  // Helper for tests to simulate incoming messages
  simulateMessage(data: string): void {
    this.onmessage?.({ data } as MessageEvent)
  }

  // Helper for tests to simulate errors
  simulateError(): void {
    this.onerror?.(new Event('error'))
  }

  // Helper for tests to simulate server closing
  simulateClose(code = 1000, reason = ''): void {
    this.onclose?.({ code, reason, wasClean: code === 1000 } as CloseEvent)
  }

  // Helper for tests to get sent messages
  getSentMessages(): ArrayBuffer[] {
    return this.sentMessages
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Necessary for mocking
globalThis.WebSocket = MockWebSocket as any

// Export for test access
export { MockWebSocket }

// Mock AudioWorkletNode for tests
class MockAudioWorkletNode {
  port: {
    onmessage: ((event: MessageEvent) => void) | null
    postMessage: (message: unknown) => void
  }

  constructor() {
    this.port = {
      onmessage: null,
      postMessage: () => {},
    }
  }

  disconnect(): void {
    // No-op for tests
  }

  // Helper for tests to simulate worklet messages
  simulateMessage(data: ArrayBuffer): void {
    this.port.onmessage?.({ data } as MessageEvent)
  }

  isDisconnected(): boolean {
    return false
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Necessary for mocking
globalThis.AudioWorkletNode = MockAudioWorkletNode as any

// Mock AudioContext.audioWorklet.addModule for tests
const mockAudioWorklet = {
  addModule: (_url: string): Promise<void> => Promise.resolve(),
}

// Mock AudioContext for tests
globalThis.AudioContext = class AudioContext {
  state: 'running' | 'closed' = 'running'
  sampleRate = 48000
  audioWorklet = mockAudioWorklet

  createMediaStreamSource() {
    return {
      connect: () => {},
    }
  }

  createAnalyser() {
    return {
      fftSize: 2048,
      connect: () => {},
      getByteTimeDomainData: () => {},
    }
  }

  close() {
    this.state = 'closed'
    return Promise.resolve()
  }
  // biome-ignore lint/suspicious/noExplicitAny: Necessary for mocking incompatible types
} as any

// Mock URL.createObjectURL / URL.revokeObjectURL
const mockUrlMap = new Map<Blob, string>()
let urlCounter = 0

globalThis.URL.createObjectURL = (blob: Blob): string => {
  const url = `blob:test-${urlCounter++}`
  mockUrlMap.set(blob, url)
  return url
}

globalThis.URL.revokeObjectURL = (url: string): void => {
  for (const [blob, mockUrl] of mockUrlMap.entries()) {
    if (mockUrl === url) {
      mockUrlMap.delete(blob)
      break
    }
  }
}

// Mock pointer capture methods for jsdom (which doesn't support them)
if (typeof HTMLButtonElement !== 'undefined') {
  HTMLButtonElement.prototype.setPointerCapture = (
    _pointerId: number
  ): void => {}
  HTMLButtonElement.prototype.releasePointerCapture = (
    _pointerId: number
  ): void => {}
}

// Mock getUserMedia with enhanced mock that includes sampleRate
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  value: {
    getUserMedia: () =>
      Promise.resolve({
        getTracks: () => [
          {
            stop: () => {},
            getSettings: () => ({ sampleRate: 48000 }),
          },
        ],
        getAudioTracks: () => [
          {
            stop: () => {},
            getSettings: () => ({ sampleRate: 48000 }),
          },
        ],
      }),
  },
  writable: true,
  configurable: true,
})

// Mock MediaRecorder for tests
globalThis.MediaRecorder = class MediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  ondataavailable: ((event: Record<string, unknown>) => void) | null = null
  onstop: (() => void) | null = null

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    if (this.onstop) this.onstop()
  }
  // biome-ignore lint/suspicious/noExplicitAny: Necessary for mocking incompatible types
} as any
