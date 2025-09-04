import type { DictateButtonProps } from '../dictate-button'

/**
 * Inject the dictate-button component to text fields.
 *
 * Optionally log button events to the console (verbose mode).
 *
 * @param {string} textFieldSelector
 * @param {number} buttonSize
 * @param {number} buttonMargin
 * @param {boolean} verbose
 */
export function injectDictateButton(
  textFieldSelector: string,
  buttonSize: number,
  buttonMargin: number,
  verbose: boolean = false
) {
  const textFields = document.querySelectorAll(textFieldSelector) as NodeListOf<
    HTMLInputElement | HTMLTextAreaElement
  >

  for (const textField of textFields) {
    // Skip already processed fields and mark early for idempotency.
    if (textField.hasAttribute('data-dictate-button-enabled')) continue
    textField.setAttribute('data-dictate-button-enabled', '')

    // Add a wrapper div with relative positioning.
    const container = document.createElement('div')
    container.style.position = 'relative'
    container.style.display = 'inline-block'
    container.style.width = 'auto'
    container.style.color = 'inherit'

    const parent = textField.parentNode
    if (!parent) {
      verbose &&
        console.warn('injectDictateButton: element has no parent', textField)
      continue
    }
    parent.insertBefore(container, textField)

    container.appendChild(textField)

    // Ensure textarea fills container.
    textField.style.boxSizing = 'border-box'

    // Add the dictate-button component.
    const dictateBtn = document.createElement('dictate-button') as HTMLElement &
      DictateButtonProps
    dictateBtn.size = buttonSize
    dictateBtn.style.position = 'absolute'
    dictateBtn.style.right = '0'
    dictateBtn.style.top =
      calculateButtonPositionTop(
        container,
        textField,
        buttonSize,
        buttonMargin
      ) + 'px'
    dictateBtn.style.margin = buttonMargin + 'px'

    // Set the document language as the dictate-button component's language if set.
    const lang = document.documentElement.lang
    if (lang && lang.length >= 2) {
      dictateBtn.language = lang
    }

    // Add event listeners for the dictate-button component.
    dictateBtn.addEventListener('recording:started', (e) => {
      verbose && console.log('recording:started', e)
    })
    dictateBtn.addEventListener('recording:stopped', (e) => {
      verbose && console.log('recording:stopped', e)
    })
    dictateBtn.addEventListener('recording:failed', (e) => {
      verbose && console.log('recording:failed', e)
      focusOnTextField(textField)
    })

    dictateBtn.addEventListener('transcribing:started', (e) => {
      verbose && console.log('transcribing:started', e)
    })
    dictateBtn.addEventListener('transcribing:finished', (e: any) => {
      verbose && console.log('transcribing:finished', e)
      const text = e.detail
      receiveText(textField, text)
    })
    dictateBtn.addEventListener('transcribing:failed', (e) => {
      verbose && console.log('transcribing:failed', e)
      focusOnTextField(textField)
    })

    container.appendChild(dictateBtn)
  }
}

function calculateButtonPositionTop(
  container: HTMLDivElement,
  textField: HTMLInputElement | HTMLTextAreaElement,
  buttonSize: number,
  buttonMargin: number
) {
  if (textField.tagName.toLowerCase() === 'textarea') {
    return 0
  }

  const calculatedTop = Math.round(
    container.clientHeight / 2 - buttonSize / 2 - buttonMargin
  )
  return Math.max(0, calculatedTop)
}

function receiveText(
  textField: HTMLInputElement | HTMLTextAreaElement,
  text: string
) {
  // Guard against non-string transcripts to avoid runtime errors.
  const textToInsert =
    typeof text === 'string' ? text.trim() : String(text ?? '').trim()

  // Ignore empty transcriptions.
  if (textToInsert.length === 0) {
    return
  }

  const start = textField.selectionStart || 0
  const end = textField.selectionEnd || 0

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
