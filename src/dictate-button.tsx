import { customElement } from 'solid-element'
import { createSignal } from 'solid-js'
import { btnDictateStyles } from './dictate-button.styles'

console.debug('dictate-button version:', __APP_VERSION__)

export interface BtnDictateProps {
  size?: number
  apiEndpoint?: string
  // The props below are for types only. We don't use them inside the component.
  theme?: 'light' | 'dark'
  class?: string
}

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'dictate-button': BtnDictateProps
    }
  }
}

type BtnDictateStatus = 'idle' | 'recording' | 'processing' | 'error'

const DEFAULT_TRANSCRIBE_API_ENDPOINT = 'http://localhost:3000/transcribe'
const APP_NAME = 'dictate-button.io'

customElement(
  'dictate-button',
  {
    size: 24,
    apiEndpoint: DEFAULT_TRANSCRIBE_API_ENDPOINT,
  },
  (props: BtnDictateProps, { element }) => {
    const { size, apiEndpoint } = props

    console.log('api', apiEndpoint)

    const [status, setStatus] = createSignal<BtnDictateStatus>('idle')

    let mediaRecorder: MediaRecorder | null = null
    let audioChunks: Blob[] = []

    const cleanup = () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
      audioChunks = []
    }

    element.addEventListener('disconnected', cleanup)

    const toggleRecording = async () => {
      cleanup()

      if (status() === 'idle') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
          audioChunks = []

          mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data)
          }

          mediaRecorder.onstop = async () => {
            setStatus('processing')

            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

            try {
              const response = await fetch(apiEndpoint!, {
                method: 'POST',
                body: audioBlob,
              })

              if (!response.ok) throw new Error('Failed to transcribe audio')

              const data = await response.json()

              // If use cancelled processing, don't emit transcribed event.
              if (status() !== 'processing') return

              event(element, 'transcribed', data.text)

              setStatus('idle')
            } catch (error) {
              console.error('Failed to transcribe audio:', error)

              event(element, 'error', 'Failed to transcribe audio')

              setErrorStatus()
            }
          }

          mediaRecorder.start()

          event(element, 'started', 'Started recording')

          setStatus('recording')
        } catch (error) {
          console.error('Failed to start recording:', error)

          event(element, 'error', 'Failed to start recording')

          setErrorStatus()
        }
      } else {
        event(element, 'stopped', 'Stopped recording')

        setStatus('idle')
      }
    }

    const setErrorStatus = () => {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }

    return (
      <div part="container" class="dictate-button__container">
        <style>{btnDictateStyles}</style>
        <button
          part="button"
          style={`width:${size}px;height:${size}px"`}
          class="dictate-button__button"
          onClick={toggleRecording}
          title={buttonTitle(status())}
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

const buttonTitle = (status: BtnDictateStatus) => {
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
  >
    <path
      fill-rule="evenodd"
      d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z"
      clip-rule="evenodd"
    />
  </svg>
)

const ProcessingIcon = () => (
  <svg
    // @ts-ignore
    part="icon"
    class="dictate-button__icon dictate-button__icon--processing"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
)

const ErrorIcon = () => (
  <svg
    // @ts-ignore
    part="icon"
    class="dictate-button__icon dictate-button__icon--error"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M6 18 18 6M6 6l12 12"
    />
  </svg>
)
