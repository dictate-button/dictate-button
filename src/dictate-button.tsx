import { customElement } from 'solid-element'
import { createEffect, createSignal, onCleanup } from 'solid-js'
import { dictateButtonStyles } from './dictate-button.styles'

console.debug('dictate-button version:', __APP_VERSION__)

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

type DictateButtonStatus = 'idle' | 'recording' | 'processing' | 'error'

const DEFAULT_TRANSCRIBE_API_ENDPOINT =
  'https://api.dictate-button.io/transcribe'
const APP_NAME = 'dictate-button.io'

// Audio analysis constants
const MIN_DB = -70,
  MAX_DB = -10
const MIN_WIDTH = 0,
  MAX_WIDTH = 4 // px
const ATTACK = 0.25,
  RELEASE = 0.05

customElement(
  'dictate-button',
  {
    size: 30,
    apiEndpoint: DEFAULT_TRANSCRIBE_API_ENDPOINT,
    language: undefined,
  },
  (props: DictateButtonProps, { element }) => {
    console.debug('api', props.apiEndpoint)

    const [status, setStatus] = createSignal<DictateButtonStatus>('idle')

    let mediaRecorder: MediaRecorder | null = null
    let mediaStream: MediaStream | null = null
    let audioChunks: Blob[] = []
    let recordingMode: 'short-tap' | 'long-press' | null = null

    // Audio analysis variables
    let audioCtx: AudioContext | null = null
    let analyser: AnalyserNode | null = null
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
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }

      // Stop all media stream tracks to release the microphone.
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
        mediaStream = null
      }

      audioChunks = []
      recordingMode = null

      // Clean up audio analysis
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

    const startRecording = async (mode: 'short-tap' | 'long-press') => {
      if (status() !== 'idle') return

      recordingMode = mode

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })

        // Store the stream so we can stop its tracks later.
        mediaStream = stream

        // Set up audio analysis
        audioCtx = new (window.AudioContext ||
          (window as any).webkitAudioContext)()
        const source = audioCtx.createMediaStreamSource(stream)
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 2048
        source.connect(analyser)
        dataArray = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>

        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        audioChunks = []

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data)
        }

        mediaRecorder.onstop = async () => {
          // Stop audio analysis.
          running = false

          setStatus('processing')

          event(element, 'transcribing:started', 'Started transcribing')

          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

          try {
            const formData = new FormData()
            formData.append('audio', audioBlob, 'recording.webm')
            formData.append('origin', window?.location?.origin)

            if (props.language) {
              formData.append('language', props.language)
            }

            const response = await fetch(props.apiEndpoint!, {
              method: 'POST',
              body: formData,
            })

            if (!response.ok) throw new Error('Failed to transcribe audio')

            const data = await response.json()

            // If user cancelled processing, don't emit transcribing:finished event.
            if (status() !== 'processing') return

            event(element, 'transcribing:finished', data.text)

            setStatus('idle')
          } catch (error) {
            console.error('Failed to transcribe audio:', error)

            event(element, 'transcribing:failed', 'Failed to transcribe audio')

            setErrorStatus()
          }
        }

        mediaRecorder.start()

        event(element, 'recording:started', 'Started recording')

        // Start audio analysis
        running = true
        rerenderRecordingIndication()

        setStatus('recording')
      } catch (error) {
        console.error('Failed to start recording:', error)

        event(element, 'recording:failed', 'Failed to start recording')

        setErrorStatus()
      }
    }

    const stopRecording = () => {
      if (status() !== 'recording') return

      event(element, 'recording:stopped', 'Stopped recording')

      setStatus('idle')
      cleanup()
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
          // Only allow short tap to stop if recording was started with short tap
          if (status() === 'idle') {
            startRecording('short-tap')
          } else if (
            status() === 'recording' &&
            recordingMode === 'short-tap'
          ) {
            stopRecording()
          }
        },
        onLongPressStart: () => {
          // Only start recording if idle
          if (status() === 'idle') {
            startRecording('long-press')
          }
        },
        onLongPressEnd: () => {
          // Only stop if recording was started with long press
          if (status() === 'recording' && recordingMode === 'long-press') {
            stopRecording()
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
          aria-pressed={status() === 'recording'}
          aria-busy={status() === 'processing'}
        >
          {status() === 'idle' && <IdleIcon />}
          {status() === 'recording' && <RecordingIcon />}
          {status() === 'processing' && <ProcessingIcon />}
          {status() === 'error' && <ErrorIcon />}
        </button>
      </div>
    )
  }
)

const buttonTitle = (status: DictateButtonStatus) => {
  switch (status) {
    case 'idle':
      return `Start dictation (${APP_NAME})`
    case 'recording':
      return `Stop dictation (${APP_NAME})`
    case 'processing':
      return `Stop processing (${APP_NAME})`
    case 'error':
      return `Click to reset (${APP_NAME})`
  }
}

const buttonAriaLabel = (status: DictateButtonStatus) => {
  switch (status) {
    case 'idle':
      return `Start dictation (${APP_NAME})`
    case 'recording':
      return `Dictation in progress. Click to stop it (${APP_NAME})`
    case 'processing':
      return `Processing dictation. Click to cancel it (${APP_NAME})`
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

const ProcessingIcon = () => (
  <svg
    // @ts-ignore
    part="icon"
    class="dictate-button__icon dictate-button__icon--processing"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    aria-hidden="true"
  >
    <path d="M12 2v4" />
    <path d="m16.2 7.8 2.9-2.9" />
    <path d="M18 12h4" />
    <path d="m16.2 16.2 2.9 2.9" />
    <path d="M12 18v4" />
    <path d="m4.9 19.1 2.9-2.9" />
    <path d="M2 12h4" />
    <path d="m4.9 4.9 2.9 2.9" />
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

type AddButtonEventListenersOptions = {
  threshold?: number
  preventScroll?: boolean
  onShortTap?: (e: PointerEvent) => void
  onLongPressStart?: (e: PointerEvent) => void
  onLongPressEnd?: (e: PointerEvent) => void
}

export function addButtonEventListeners(
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
