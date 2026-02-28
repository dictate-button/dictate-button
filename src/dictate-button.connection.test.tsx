import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import './dictate-button'
import type { MockWebSocket } from '../vitest.setup'

describe('dictate-button connection reliability', () => {
  let element: HTMLElement
  let wsInstance: MockWebSocket | null = null

  beforeEach(() => {
    document.body.innerHTML = ''
    wsInstance = null
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const setupButton = async (): Promise<HTMLElement> => {
    element = document.createElement('dictate-button')
    document.body.appendChild(element)

    // Use real timers for the initial setup to allow Solid to render
    vi.useRealTimers()
    await new Promise((resolve) => {
      setTimeout(() => {
        const button = element.shadowRoot?.querySelector('button')
        expect(button).toBeDefined()
        resolve(undefined)
      }, 100)
    })
    vi.useFakeTimers()

    return element
  }

  const startTranscribing = async (el: HTMLElement): Promise<MockWebSocket> => {
    // Override WebSocket to capture the instance
    const originalWebSocket = globalThis.WebSocket as unknown

    globalThis.WebSocket = class extends (
      (globalThis.WebSocket as {
        new (url: string): MockWebSocket
        readonly CONNECTING: number
        readonly OPEN: number
        readonly CLOSING: number
        readonly CLOSED: number
      })
    ) {
      constructor(url: string) {
        super(url)
        wsInstance = this as MockWebSocket
      }
    }

    // Switch to real timers briefly for button click to trigger component logic
    vi.useRealTimers()

    // Simulate pointerdown and pointerup to trigger short-tap
    const button = el.shadowRoot?.querySelector('button') as HTMLButtonElement
    button.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 1,
      })
    )

    // Wait for pointer processing
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Simulate pointerup to complete the short-tap
    button.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
      })
    )

    // Wait for WebSocket to be created
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Switch back to fake timers
    vi.useFakeTimers()

    // Restore original WebSocket
    globalThis.WebSocket = originalWebSocket as typeof globalThis.WebSocket

    if (!wsInstance) {
      throw new Error('WebSocket was not created')
    }

    // Manually trigger connection open (for tests using fake timers)
    wsInstance.open()

    return wsInstance
  }

  const simulateMessage = (ws: MockWebSocket, msg: object): void => {
    ws.simulateMessage(JSON.stringify(msg))
  }

  const waitForEvent = (
    el: HTMLElement,
    eventName: string
  ): Promise<CustomEvent> => {
    return new Promise((resolve) => {
      const handler = (e: Event) => {
        el.removeEventListener(eventName, handler)
        resolve(e as CustomEvent)
      }
      el.addEventListener(eventName, handler)
    })
  }

  describe('heartbeat timeout detection', () => {
    it('should fire dictate-error and dictate-end when no messages arrive for 7s', async () => {
      const element = await setupButton()

      const handleError = waitForEvent(element, 'dictate-error')
      const handleEnd = waitForEvent(element, 'dictate-end')

      const ws = await startTranscribing(element)

      // Send some interim transcript to build transcript
      simulateMessage(ws, { type: 'interim_transcript', text: 'Hello world' })

      // Advance time to trigger heartbeat timeout (7s)
      vi.advanceTimersByTime(8000)

      const errorEvent = await handleError
      expect(errorEvent.detail).toBe('Connection lost')

      const endEvent = await handleEnd
      expect(endEvent.detail).toBe('Hello world')
    })

    it('should reset heartbeat timer when any message arrives', async () => {
      const element = await setupButton()

      let errorReceived = false
      const handleError = () => {
        errorReceived = true
      }
      element.addEventListener('dictate-error', handleError)

      const ws = await startTranscribing(element)

      // Send messages every 5s (within timeout)
      simulateMessage(ws, { type: 'interim_transcript', text: 'Testing' })
      vi.advanceTimersByTime(5000)

      simulateMessage(ws, { type: 'interim_transcript', text: 'Testing more' })
      vi.advanceTimersByTime(5000)

      // Should not have triggered error yet (total time 10s)
      vi.advanceTimersByTime(3000)

      expect(errorReceived).toBe(false)
    })
  })

  describe('offline event detection', () => {
    it('should trigger connection lost when offline event fires during transcribing', async () => {
      const element = await setupButton()

      const handleError = waitForEvent(element, 'dictate-error')
      const handleEnd = waitForEvent(element, 'dictate-end')

      const ws = await startTranscribing(element)

      // Build some transcript
      simulateMessage(ws, { type: 'interim_transcript', text: 'Some text' })

      // Fire offline event
      window.dispatchEvent(new Event('offline'))

      const errorEvent = await handleError
      expect(errorEvent.detail).toBe('Connection lost')

      const endEvent = await handleEnd
      expect(endEvent.detail).toBe('Some text')
    })

    it('should do nothing when offline event fires while idle', async () => {
      const element = await setupButton()

      let errorReceived = false
      const handleError = () => {
        errorReceived = true
      }
      element.addEventListener('dictate-error', handleError)

      // Don't start transcribing
      // Fire offline event
      window.dispatchEvent(new Event('offline'))

      // Advance timers a bit
      vi.advanceTimersByTime(100)

      expect(errorReceived).toBe(false)
    })
  })

  describe('session_closed message handling', () => {
    it('should trigger connection lost when server sends session_closed', async () => {
      const element = await setupButton()

      const handleError = waitForEvent(element, 'dictate-error')
      const handleEnd = waitForEvent(element, 'dictate-end')

      const ws = await startTranscribing(element)

      // Build transcript
      simulateMessage(ws, { type: 'interim_transcript', text: 'Partial text' })

      // Server closes session
      simulateMessage(ws, {
        type: 'session_closed',
        reason: 'Server shutdown',
      })

      const errorEvent = await handleError
      expect(errorEvent.detail).toBe('Connection lost')

      const endEvent = await handleEnd
      expect(endEvent.detail).toBe('Partial text')
    })
  })

  describe('interim transcript preservation on stop', () => {
    it('should include interim text in dictate-end when stopping', async () => {
      const element = await setupButton()

      const handleText = waitForEvent(element, 'dictate-text')
      const handleEnd = waitForEvent(element, 'dictate-end')

      const ws = await startTranscribing(element)

      // Send interim transcript
      simulateMessage(ws, {
        type: 'interim_transcript',
        text: 'interim transcript',
      })

      const textEvent = await handleText
      expect(textEvent.detail).toBe('interim transcript')

      // Stop transcribing by clicking again
      const button = element.shadowRoot?.querySelector(
        'button'
      ) as HTMLButtonElement
      button.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
        })
      )
      vi.advanceTimersByTime(50)
      button.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
        })
      )

      // Wait for finalize timeout (500ms)
      vi.advanceTimersByTime(500)

      const endEvent = await handleEnd
      expect(endEvent.detail).toBe('interim transcript')
    })

    it('should clear interim and use final transcript if final arrives during 500ms window', async () => {
      const element = await setupButton()

      const handleText = waitForEvent(element, 'dictate-text')
      const handleEnd = waitForEvent(element, 'dictate-end')

      const ws = await startTranscribing(element)

      // Send interim transcript
      simulateMessage(ws, {
        type: 'interim_transcript',
        text: 'interim text',
      })

      await handleText

      // Stop transcribing by clicking again
      const button = element.shadowRoot?.querySelector(
        'button'
      ) as HTMLButtonElement
      button.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
        })
      )
      vi.advanceTimersByTime(50)
      button.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
        })
      )

      // Final transcript arrives before 500ms
      vi.advanceTimersByTime(100)
      simulateMessage(ws, {
        type: 'transcript',
        text: 'final transcript',
        turn_order: 0,
      })

      // Wait for finalize timeout to complete
      vi.advanceTimersByTime(400)

      const endEvent = await handleEnd
      expect(endEvent.detail).toBe('final transcript')
    })
  })

  describe('heartbeat message handling', () => {
    it('should reset timeout but not emit dictate-text for heartbeat messages', async () => {
      const element = await setupButton()

      let textReceived = false
      const handleText = () => {
        textReceived = true
      }
      element.addEventListener('dictate-text', handleText)

      let errorReceived = false
      const handleError = () => {
        errorReceived = true
      }
      element.addEventListener('dictate-error', handleError)

      const ws = await startTranscribing(element)

      // Send heartbeat messages
      simulateMessage(ws, { type: 'heartbeat' })
      vi.advanceTimersByTime(2000)

      simulateMessage(ws, { type: 'heartbeat' })
      vi.advanceTimersByTime(2000)

      simulateMessage(ws, { type: 'heartbeat' })
      vi.advanceTimersByTime(2000)

      // Should not have emitted dictate-text for heartbeats
      expect(textReceived).toBe(false)

      // Should not have triggered timeout (total time 6s < 7s)
      expect(errorReceived).toBe(false)
    })

    it('should treat heartbeat as regular message for timeout purposes', async () => {
      const element = await setupButton()

      let errorReceived = false
      const handleError = () => {
        errorReceived = true
      }
      element.addEventListener('dictate-error', handleError)

      const ws = await startTranscribing(element)

      // Send heartbeat every 5s (within timeout)
      simulateMessage(ws, { type: 'heartbeat' })
      vi.advanceTimersByTime(5000)

      simulateMessage(ws, { type: 'heartbeat' })
      vi.advanceTimersByTime(5000)

      // Should not have triggered error yet (total time 10s)
      vi.advanceTimersByTime(3000)

      expect(errorReceived).toBe(false)
    })
  })
})
