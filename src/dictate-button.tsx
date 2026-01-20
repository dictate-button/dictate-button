import { customElement } from 'solid-element'
import { createEffect, createSignal, onCleanup } from 'solid-js'
import { dictateButtonStyles } from './dictate-button.styles'

console.debug('[dictate-button] version:', __APP_VERSION__)

export interface DictateButtonProps {
  size?: number
  apiEndpoint?: string
  language?: string
  // The props below are for types only. We don't use them inside the component.
  theme?: 'light' | 'dark'
  class?: string
}

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'dictate-button': Element & DictateButtonProps
    }
  }
}

type DictateButtonStatus = 'idle' | 'transcribing' | 'finalizing' | 'error'

const DEFAULT_TRANSCRIBE_API_ENDPOINT =
  'wss://api.dictate-button.io/v2/transcribe'
const APP_NAME = 'dictate-button.io'

// Audio analysis constants
const MIN_DB = -70,
  MAX_DB = -10
const MIN_WIDTH = 0,
  MAX_WIDTH = 4 // px
const ATTACK = 0.25,
  RELEASE = 0.05

// Prevent duplicate registration.
if (!customElements.get('dictate-button')) {
  customElement(
    'dictate-button',
    {
      size: 30,
      apiEndpoint: DEFAULT_TRANSCRIBE_API_ENDPOINT,
      language: 'en',
    },
    (props: DictateButtonProps, { element }) => {
      console.debug('[dictate-button] api:', props.apiEndpoint)

      const [status, setStatus] = createSignal<DictateButtonStatus>('idle')

      let ws: WebSocket | null = null
      let mediaStream: MediaStream | null = null
      let recordingMode: 'short-tap' | 'long-press' | null = null
      let lastTranscript = ''
      let accumulatedTranscript = '' // Accumulate across turns
      let currentTurnOrder = -1
      let currentInterim = '' // Current interim transcript (not yet final)

      // Audio processing variables
      let audioCtx: AudioContext | null = null
      let analyser: AnalyserNode | null = null
      let workletNode: AudioWorkletNode | null = null
      let dataArray: Uint8Array<ArrayBuffer> | null = null
      let running = false
      let smoothLevel = 0

      // Audio analysis helper functions
      const dbToNorm = (db: number) => {
        if (db <= MIN_DB) return 0
        if (db >= MAX_DB) return 1
        return (db - MIN_DB) / (MAX_DB - MIN_DB)
      }

      const rmsFromTimeDomain = (buf: Uint8Array) => {
        let sum = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          sum += v * v
        }
        return Math.sqrt(sum / buf.length)
      }

      const rmsToDb = (rms: number) => {
        const minRms = 1e-8
        return 20 * Math.log10(Math.max(rms, minRms))
      }

      const updateShadow = (norm: number) => {
        const button = element.shadowRoot.querySelector(
          '.dictate-button__button'
        ) as HTMLElement

        if (!button) {
          return
        }

        const width = MIN_WIDTH + norm * (MAX_WIDTH - MIN_WIDTH)
        const alpha = 0.0 + norm * 0.4
        button.style.boxShadow = `0 0 0 ${width}px light-dark(rgba(0, 0, 0, ${alpha}), rgba(255, 255, 255, ${alpha}))`
      }

      const rerenderRecordingIndication = () => {
        if (!running || !analyser || !dataArray) return

        analyser.getByteTimeDomainData(dataArray)
        const rms = rmsFromTimeDomain(dataArray)
        const db = rmsToDb(rms)
        const norm = dbToNorm(db)

        const alpha = norm > smoothLevel ? ATTACK : RELEASE
        smoothLevel = alpha * norm + (1 - alpha) * smoothLevel

        updateShadow(smoothLevel)

        requestAnimationFrame(rerenderRecordingIndication)
      }

      const cleanup = () => {
        // Close WebSocket connection
        if (ws) {
          ws.close()
          ws = null
        }

        // Disconnect worklet
        if (workletNode) {
          workletNode.disconnect()
          workletNode = null
        }

        // Stop all media stream tracks to release the microphone.
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop())
          mediaStream = null
        }

        recordingMode = null
        lastTranscript = ''
        accumulatedTranscript = ''
        currentTurnOrder = -1
        currentInterim = ''

        // Clean up audio context
        running = false
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close()
        }
        audioCtx = null
        analyser = null
        dataArray = null
        smoothLevel = 0
        updateShadow(0)
      }

      element.addEventListener('disconnected', cleanup)

      // Stop recording when user changes tab
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && status() === 'transcribing') {
          stopTranscribing()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      onCleanup(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      })

      const startTranscribing = async (mode: 'short-tap' | 'long-press') => {
        if (status() !== 'idle') return

        recordingMode = mode
        lastTranscript = ''
        accumulatedTranscript = ''
        currentTurnOrder = -1
        currentInterim = ''

        try {
          // Get microphone access
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: { ideal: 16000 },
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
          })
          mediaStream = stream

          // Get the actual sample rate from the audio track
          const audioTrack = stream.getAudioTracks()[0]
          const trackSettings = audioTrack.getSettings()
          const actualSampleRate = trackSettings.sampleRate || 48000

          // Set up audio context with the same sample rate as the MediaStream
          // This prevents Firefox error: "Connecting AudioNodes from AudioContexts with different sample-rate"
          audioCtx = new (
            window.AudioContext || (window as any).webkitAudioContext
          )({ sampleRate: actualSampleRate })
          const source = audioCtx.createMediaStreamSource(stream)

          // Set up analyser for visual feedback
          analyser = audioCtx.createAnalyser()
          analyser.fftSize = 2048
          source.connect(analyser)
          dataArray = new Uint8Array(
            analyser.fftSize
          ) as Uint8Array<ArrayBuffer>

          // Create worklet module as Blob URL (portable, works from any origin)
          const workletCode = `
            class PcmProcessor extends AudioWorkletProcessor {
              constructor(options) {
                super()
                this.inputSampleRate = options.processorOptions.inputSampleRate
                this.outputSampleRate = 16000
                this.ratio = this.inputSampleRate / this.outputSampleRate
                this.buffer = []
                this.bufferIndex = 0
              }

              process(inputs) {
                const input = inputs[0]
                if (input.length > 0) {
                  const channelData = input[0]

                  // Resample to 16kHz if needed
                  let resampledData
                  if (this.ratio === 1) {
                    // No resampling needed
                    resampledData = channelData
                  } else {
                    // Simple decimation for downsampling
                    const outputLength = Math.floor(channelData.length / this.ratio)
                    resampledData = new Float32Array(outputLength)
                    for (let i = 0; i < outputLength; i++) {
                      const srcIndex = Math.floor(i * this.ratio)
                      resampledData[i] = channelData[srcIndex]
                    }
                  }

                  // Convert to PCM16
                  const pcm16 = new Int16Array(resampledData.length)
                  for (let i = 0; i < resampledData.length; i++) {
                    const s = Math.max(-1, Math.min(1, resampledData[i]))
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
                  }
                  this.port.postMessage(pcm16.buffer, [pcm16.buffer])
                }
                return true
              }
            }
            registerProcessor('pcm-processor', PcmProcessor)
          `
          const workletBlob = new Blob([workletCode], {
            type: 'application/javascript',
          })
          const workletUrl = URL.createObjectURL(workletBlob)

          // Load and set up AudioWorklet for PCM capture
          await audioCtx.audioWorklet.addModule(workletUrl)
          URL.revokeObjectURL(workletUrl)
          workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor', {
            processorOptions: { inputSampleRate: actualSampleRate }
          })
          source.connect(workletNode)

          // Connect to WebSocket with language parameter
          const wsUrl = new URL(props.apiEndpoint!)
          if (props.language) {
            wsUrl.searchParams.set('language', props.language)
          }
          ws = new WebSocket(wsUrl.toString())

          ws.onmessage = (evt) => {
            try {
              const msg = JSON.parse(evt.data)

              if (msg.type === 'interim_transcript' && msg.text) {
                // Update current interim (these are NOT final, they get replaced)
                currentInterim = msg.text

                // Display: accumulated finals + last final + current interim
                const displayText = [
                  accumulatedTranscript,
                  lastTranscript,
                  currentInterim,
                ]
                  .filter(Boolean)
                  .join(' ')

                event(element, 'dictate-text', displayText)
              } else if (msg.type === 'transcript' && msg.text) {
                const turnOrder = msg.turn_order ?? 0
                const currentTurnText = msg.text

                // Clear interim since we got a final
                currentInterim = ''

                // Check if this is a new turn
                if (turnOrder > currentTurnOrder) {
                  // New turn started - accumulate previous turn's text
                  if (lastTranscript) {
                    accumulatedTranscript = accumulatedTranscript
                      ? accumulatedTranscript + ' ' + lastTranscript
                      : lastTranscript
                  }

                  currentTurnOrder = turnOrder
                  lastTranscript = currentTurnText
                } else {
                  // Same turn - check if this is a refinement or new utterance
                  const isRefinement =
                    currentTurnText.length > lastTranscript.length &&
                    currentTurnText.startsWith(
                      lastTranscript.substring(
                        0,
                        Math.min(10, lastTranscript.length)
                      )
                    )

                  if (isRefinement) {
                    // This is a refinement (longer version of same text) - replace
                    lastTranscript = currentTurnText
                  } else {
                    // This is a new utterance in the same turn - accumulate
                    lastTranscript = lastTranscript
                      ? lastTranscript + ' ' + currentTurnText
                      : currentTurnText
                  }
                }

                // Send the combined text for display (accumulated + current final)
                const displayText = accumulatedTranscript
                  ? accumulatedTranscript + ' ' + lastTranscript
                  : lastTranscript

                event(element, 'dictate-text', displayText)
              } else if (msg.type === 'error') {
                console.error('[dictate-button] Server error:', msg.error)
                event(element, 'dictate-error', msg.error)
                setErrorStatus()
                cleanup()
              }
            } catch (error) {
              console.error('[dictate-button] Error parsing message:', error)
            }
          }

          ws.onerror = (err) => {
            console.error('[dictate-button] WebSocket error:', err)
            event(element, 'dictate-error', 'Connection error')
            setErrorStatus()
            cleanup()
          }

          ws.onclose = () => {
            // WebSocket closed
          }

          // Stream PCM data to WebSocket when available
          workletNode.port.onmessage = (evt) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(evt.data)
            }
          }

          event(element, 'dictate-start', 'Started transcribing')

          // Start audio level visualization
          running = true
          rerenderRecordingIndication()

          setStatus('transcribing')
        } catch (error) {
          console.error('[dictate-button] Failed to start:', error)
          event(element, 'dictate-error', 'Failed to start transcription')
          setErrorStatus()
          cleanup()
        }
      }

      const stopTranscribing = () => {
        if (status() !== 'transcribing') return

        running = false
        setStatus('finalizing')

        // Send close message to backend to trigger Finalize
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'close' }))

          // Wait 0.5 seconds for final transcripts to arrive
          setTimeout(() => {
            // Emit final transcript (accumulated + last)
            const finalTranscript = accumulatedTranscript
              ? accumulatedTranscript +
                (lastTranscript ? ' ' + lastTranscript : '')
              : lastTranscript

            if (finalTranscript) {
              event(element, 'dictate-end', finalTranscript)
            }

            cleanup()
            setStatus('idle')
          }, 500)
        } else {
          // WebSocket not open, cleanup immediately
          const finalTranscript = accumulatedTranscript
            ? accumulatedTranscript +
              (lastTranscript ? ' ' + lastTranscript : '')
            : lastTranscript

          if (finalTranscript) {
            event(element, 'dictate-end', finalTranscript)
          }

          cleanup()
          setStatus('idle')
        }
      }

      const setErrorStatus = () => {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 2000)
      }

      let buttonRef: HTMLButtonElement | undefined

      createEffect(() => {
        if (!buttonRef) return

        const removeButtonEventListeners = addButtonEventListeners(buttonRef, {
          onShortTap: () => {
            if (status() === 'idle') {
              startTranscribing('short-tap')
            } else if (
              status() === 'transcribing' &&
              recordingMode === 'short-tap'
            ) {
              stopTranscribing()
            }
          },
          onLongPressStart: () => {
            if (status() === 'idle') {
              startTranscribing('long-press')
            }
          },
          onLongPressEnd: () => {
            if (status() === 'transcribing' && recordingMode === 'long-press') {
              stopTranscribing()
            }
          },
        })

        onCleanup(removeButtonEventListeners)
      })

      return (
        <div part="container" class="dictate-button__container">
          <style>{dictateButtonStyles}</style>
          <div
            aria-live="polite"
            class="dictate-button__status-announcer"
            style="position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;"
          >
            {buttonAriaLabel(status())}
          </div>
          <button
            ref={buttonRef}
            part="button"
            style={`width:${props.size}px;height:${props.size}px"`}
            class="dictate-button__button"
            title={buttonTitle(status())}
            aria-label={buttonAriaLabel(status())}
            aria-pressed={status() === 'transcribing'}
            aria-busy={status() === 'transcribing' || status() === 'finalizing'}
          >
            {status() === 'idle' && <IdleIcon />}
            {status() === 'transcribing' && <RecordingIcon />}
            {status() === 'finalizing' && <FinalizingIcon />}
            {status() === 'error' && <ErrorIcon />}
          </button>
        </div>
      )
    }
  )
} else {
  console.debug(
    `[dictate-button] We don't require importing the dictate-button component separately anymore, so you may remove the script tag which imports https://cdn.dictate-button.io/dictate-button.js from the HTML head.`
  )
}

const buttonTitle = (status: DictateButtonStatus) => {
  switch (status) {
    case 'idle':
      return `Start dictation (${APP_NAME})`
    case 'transcribing':
      return `Stop dictation (${APP_NAME})`
    case 'finalizing':
      return `Finalizing dictation (${APP_NAME})`
    case 'error':
      return `Click to reset (${APP_NAME})`
  }
}

const buttonAriaLabel = (status: DictateButtonStatus) => {
  switch (status) {
    case 'idle':
      return `Start dictation (${APP_NAME})`
    case 'transcribing':
      return `Transcribing. Click to stop (${APP_NAME})`
    case 'finalizing':
      return `Finalizing dictation. Please wait (${APP_NAME})`
    case 'error':
      return `Dictation error. Click to reset (${APP_NAME})`
  }
}

const event = (element: any, eventName: string, detail: string) => {
  element.dispatchEvent(
    new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true,
    })
  )
}

const IdleIcon = () => (
  <svg
    // @ts-ignore
    part="icon"
    class={`dictate-button__icon dictate-button__icon--idle`}
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    role="img"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
    />
  </svg>
)

const RecordingIcon = () => (
  <svg
    // @ts-ignore
    part="icon"
    class="dictate-button__icon dictate-button__icon--recording"
    viewBox="0 0 24 24"
    fill="currentColor"
    role="img"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
)

const ErrorIcon = () => (
  <svg
    // @ts-ignore
    part="icon"
    class="dictate-button__icon dictate-button__icon--error"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="4"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    aria-hidden="true"
  >
    <line x1="12" x2="12" y1="4" y2="14" />
    <line x1="12" x2="12.01" y1="20" y2="20" />
  </svg>
)

const FinalizingIcon = () => (
  <svg
    // @ts-ignore
    part="icon"
    class="dictate-button__icon dictate-button__icon--processing"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    aria-hidden="true"
  >
    <path d="M12 2v4" />
    <path d="M12 18v4" />
    <path d="M4.93 4.93l2.83 2.83" />
    <path d="M16.24 16.24l2.83 2.83" />
    <path d="M2 12h4" />
    <path d="M18 12h4" />
    <path d="M4.93 19.07l2.83-2.83" />
    <path d="M16.24 7.76l2.83-2.83" />
  </svg>
)

type AddButtonEventListenersOptions = {
  threshold?: number
  preventScroll?: boolean
  onShortTap?: (e: PointerEvent) => void
  onLongPressStart?: (e: PointerEvent) => void
  onLongPressEnd?: (e: PointerEvent) => void
}

function addButtonEventListeners(
  element: HTMLButtonElement,
  {
    threshold = 500,
    preventScroll = true,
    onShortTap,
    onLongPressStart,
    onLongPressEnd,
  }: AddButtonEventListenersOptions = {}
) {
  let pressTimer: number | undefined
  let longPressTriggered = false

  const onContextMenu = (e: Event) => e.preventDefault()

  const onPointerDown = (e: PointerEvent) => {
    if (pressTimer) clearTimeout(pressTimer)
    longPressTriggered = false
    e.preventDefault()

    // capture the pointer → ensures we get pointerup even if pointer leaves element
    element.setPointerCapture(e.pointerId)

    pressTimer = window.setTimeout(() => {
      longPressTriggered = true
      onLongPressStart?.(e)
      element.dispatchEvent(new CustomEvent('longpress', { detail: e }))
    }, threshold)
  }

  const onPointerUp = (e: PointerEvent) => {
    if (pressTimer) clearTimeout(pressTimer)

    // release capture
    element.releasePointerCapture(e.pointerId)

    if (longPressTriggered) {
      onLongPressEnd?.(e)
      element.dispatchEvent(new CustomEvent('longpressend', { detail: e }))
    } else {
      onShortTap?.(e)
      element.dispatchEvent(new CustomEvent('shorttap', { detail: e }))
    }
  }

  const onPointerCancel = (e: PointerEvent) => {
    if (pressTimer) clearTimeout(pressTimer)
    element.releasePointerCapture(e.pointerId)

    if (longPressTriggered) {
      onLongPressEnd?.(e)
      element.dispatchEvent(new CustomEvent('longpressend', { detail: e }))
    }

    longPressTriggered = false
  }

  const onClick = (e: MouseEvent) => {
    // Prevent default click behavior since we handle everything via pointer events
    e.preventDefault()
    e.stopPropagation()
  }

  // Attach listeners
  if (preventScroll) {
    element.style.touchAction = 'none'
    element.addEventListener('contextmenu', onContextMenu)
  }
  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointerup', onPointerUp)
  element.addEventListener('pointercancel', onPointerCancel)
  element.addEventListener('click', onClick)

  // Return cleanup function
  return () => {
    if (preventScroll) element.removeEventListener('contextmenu', onContextMenu)
    element.removeEventListener('pointerdown', onPointerDown)
    element.removeEventListener('pointerup', onPointerUp)
    element.removeEventListener('pointercancel', onPointerCancel)
    element.removeEventListener('click', onClick)
  }
}
