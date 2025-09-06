import type { DictateButtonProps } from '../dictate-button'

const DEFAULT_BUTTON_MARGIN = 10 // in px; in case if can't calculate it based on the textfield padding.

/**
 * Options for the dictate button injection.
 */
export interface InjectDictateButtonOptions {
  /** Size of the button in pixels; defaults to 30 */
  buttonSize?: number
  /** Whether to log events to console */
  verbose?: boolean
  /** Optional custom API endpoint */
  customApiEndpoint?: string
}

/**
 * Inject the dictate-button component to text fields.
 *
 * Optionally log button events to the console (verbose mode).
 *
 * @param {string} textFieldSelector - CSS selector for text fields to enhance
 * @param {InjectDictateButtonOptions} options - Configuration options
 */
export function injectDictateButton(
  textFieldSelector: string,
  options: InjectDictateButtonOptions = {}
) {
  const {
    buttonSize = 30,
    verbose = false,
    customApiEndpoint,
  } = options

  const textFields = document.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement
  >(textFieldSelector)

  for (const textField of textFields) {
    // Skip already processed fields.
    if (textField.hasAttribute('data-dictate-button-enabled')) continue

    // Skip detached nodes to avoid false-positive marking.
    const parent = textField.parentNode
    if (!textField.isConnected || !parent) {
      if (verbose) {
        console.debug('injectDictateButton: skipping detached field', textField)
      }
      continue
    }

    // Mark early for idempotency once we know we can insert.
    textField.setAttribute('data-dictate-button-enabled', '')

    // Add a wrapper div with relative positioning.
    const wrapper = document.createElement('div')
    wrapper.style.position = 'relative'
    // Preserve block-level layouts (100% width inputs/textareas).
    const csField = getComputedStyle(textField)
    const isBlock = csField.display === 'block'
    wrapper.style.display = isBlock ? 'block' : 'inline-block'
    wrapper.style.width = isBlock ? '100%' : 'auto'
    wrapper.style.color = 'inherit'
    wrapper.classList.add('dictate-button-wrapper')

    parent.insertBefore(wrapper, textField)
    wrapper.appendChild(textField)

    // Mirror margins to wrapper to keep external spacing the same.
    wrapper.style.margin = csField.margin
    textField.style.margin = '0'

    // Ensure text field fills the container.
    textField.style.boxSizing = 'border-box'

    // Prevent text from being obscured by the button.
    const oldTextfieldRightPadding = parseFloat(
      csField.paddingRight || `${DEFAULT_BUTTON_MARGIN}px`
    )
    textField.style.paddingRight = `${buttonSize + oldTextfieldRightPadding * 2}px`

    // Add the dictate-button component.
    const dictateBtn = document.createElement('dictate-button') as HTMLElement &
      DictateButtonProps
    dictateBtn.size = buttonSize
    dictateBtn.style.position = 'absolute'
    dictateBtn.style.right = '0'

    dictateBtn.style.top = calculateButtonPositionTop(
      wrapper,
      textField,
      buttonSize
    )
    dictateBtn.style.marginRight =
      dictateBtn.style.marginLeft = `${oldTextfieldRightPadding}px`
    dictateBtn.style.marginTop = '0'
    dictateBtn.style.marginBottom = '0'

    if (customApiEndpoint) {
      dictateBtn.apiEndpoint = customApiEndpoint
    }

    // Set the document language as the dictate-button component's language if set.
    const lang = document.documentElement.lang
    if (lang && lang.length >= 2) {
      // We need to convert the larger language code "en-US" to "en" for the dictate-button API,
      // which only accepts "en" as the language code.
      const locale = new Intl.Locale(lang)
      dictateBtn.language = locale.language
    }

    // Add event listeners for the dictate-button component.
    dictateBtn.addEventListener('recording:started', (e) => {
      verbose && console.debug('recording:started', e)
    })
    dictateBtn.addEventListener('recording:stopped', (e) => {
      verbose && console.debug('recording:stopped', e)
    })
    dictateBtn.addEventListener('recording:failed', (e) => {
      verbose && console.debug('recording:failed', e)
      focusOnTextField(textField)
    })

    dictateBtn.addEventListener('transcribing:started', (e) => {
      verbose && console.debug('transcribing:started', e)
    })
    dictateBtn.addEventListener('transcribing:finished', (e) => {
      verbose && console.debug('transcribing:finished', e)
      const text = (e as CustomEvent<string>).detail
      receiveText(textField, text)
    })
    dictateBtn.addEventListener('transcribing:failed', (e) => {
      verbose && console.debug('transcribing:failed', e)
      focusOnTextField(textField)
    })

    wrapper.appendChild(dictateBtn)
  }
}

function calculateButtonPositionTop(
  container: HTMLDivElement,
  textField: HTMLInputElement | HTMLTextAreaElement,
  buttonSize: number
): string {
  if (textField.tagName.toLowerCase() === 'textarea') {
    const csTextfield = getComputedStyle(textField)
    return csTextfield.paddingTop || `${DEFAULT_BUTTON_MARGIN}px`
  }

  const calculatedTop = Math.round(container.clientHeight / 2 - buttonSize / 2)
  return `${Math.max(0, calculatedTop)}px`
}

function receiveText(
  textField: HTMLInputElement | HTMLTextAreaElement,
  text: unknown
) {
  // Guard against non-string transcripts to avoid runtime errors.
  const textToInsert =
    typeof text === 'string' ? text.trim() : String(text ?? '').trim()

  // Ignore empty transcriptions.
  if (textToInsert.length === 0) {
    return
  }

  const start = textField.selectionStart ?? 0
  const end = textField.selectionEnd ?? 0

  // Check if we need to add whitespace before the text.
  const prevChar = start > 0 ? textField.value.charAt(start - 1) : ''
  const needsLeadingSpace = prevChar && !/\s/.test(prevChar)

  // Check if we need to add whitespace after the text.
  const nextChar =
    end < textField.value.length ? textField.value.charAt(end) : ''
  const needsTrailingSpace = nextChar && !/\s/.test(nextChar)

  // Add whitespace as needed.
  const formattedText =
    (needsLeadingSpace ? ' ' : '') +
    textToInsert +
    (needsTrailingSpace ? ' ' : '')

  // Replace selection with the formatted text.
  const newCaretPos = start + formattedText.length
  const prevScrollTop =
    typeof textField.scrollTop === 'number' ? textField.scrollTop : null
  if (typeof textField.setRangeText === 'function') {
    textField.setRangeText(formattedText, start, end, 'end')
  } else {
    textField.value =
      textField.value.substring(0, start) +
      formattedText +
      textField.value.substring(end)
    try {
      textField.selectionStart = newCaretPos
      textField.selectionEnd = newCaretPos
    } catch (_) {
      // Some inputs may not support selection; ignore safely.
    }
  }
  if (prevScrollTop !== null) {
    // Restore scroll to avoid jumpiness in large textareas.
    textField.scrollTop = prevScrollTop
  }

  // Notify all listeners.
  textField.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

  focusOnTextField(textField)
}

function focusOnTextField(textField: HTMLInputElement | HTMLTextAreaElement) {
  try {
    textField.focus({ preventScroll: true })
  } catch (_) {
    textField.focus()
  }
}
