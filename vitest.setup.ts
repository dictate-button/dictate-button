// Mock global variables that the component expects
globalThis.__APP_VERSION__ = 'test-version'

// Mock MediaRecorder for tests
globalThis.MediaRecorder = class MediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  ondataavailable: ((event: any) => void) | null = null
  onstop: (() => void) | null = null

  constructor(stream: any, options?: any) {}

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    if (this.onstop) this.onstop()
  }
} as any

// Mock AudioContext for tests
globalThis.AudioContext = class AudioContext {
  state: 'running' | 'closed' = 'running'

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
} as any

// Mock getUserMedia
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  value: {
    getUserMedia: () => Promise.resolve({
      getTracks: () => [{
        stop: () => {},
      }],
    }),
  },
  writable: true,
  configurable: true,
})
