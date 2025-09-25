import type { DictateButtonProps } from '../dictate-button'

/**
 * This is a fallback for automatic calculation of the button position inside the container.
 * It is used when we cannot reliably calculate the button position based on the original text field padding.
 * We need it to ensure that the recording animation has enough space to be visible.
 */
const MIN_BUTTON_MARGIN = 4 // px

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
  const { buttonSize = 30, verbose = false, customApiEndpoint } = options

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
    const marginX = calculateButtonMarginX(csField)
    textField.style.paddingRight = `${buttonSize + marginX * 2}px`

    // Add the dictate-button component.
    const dictateBtn = document.createElement('dictate-button') as HTMLElement &
      DictateButtonProps
    dictateBtn.size = buttonSize
    dictateBtn.style.position = 'absolute'
    dictateBtn.style.right = '0'

    dictateBtn.style.top =
      calculateButtonPositionTop(
        wrapper,
        csField,
        textField.tagName,
        buttonSize
      ) + 'px'
    dictateBtn.style.marginRight = dictateBtn.style.marginLeft = `${marginX}px`
    dictateBtn.style.marginTop = '0'
    dictateBtn.style.marginBottom = '0'

    if (customApiEndpoint) {
      dictateBtn.apiEndpoint = customApiEndpoint
    }

    // Set the normalized document language as the dictate-button component's language if set.
    dictateBtn.language = getDocumentLanguage()

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

function getDocumentLanguage(): string | undefined {
  const lang = document.documentElement.lang
  if (lang && lang.length >= 2) {
    // Convert "en-US" → "en" with robust fallback when Intl.Locale is missing or lang is invalid.
    try {
      const hasIntlLocale = (Intl as any)?.Locale
      const locale = hasIntlLocale ? new Intl.Locale(lang) : null
      return locale?.language ?? lang.split(/[-_]/)[0].toLowerCase()
    } catch {
      return lang.split(/[-_]/)[0].toLowerCase()
    }
  }
}

function calculateButtonPositionTop(
  container: HTMLDivElement,
  textFieldComputedStyle: CSSStyleDeclaration,
  textFieldTagName: string,
  buttonSize: number
): number {
  if (textFieldTagName.toLowerCase() === 'textarea') {
    const paddingTop = parseFloat(textFieldComputedStyle.paddingTop || '0')
    return Math.max(MIN_BUTTON_MARGIN, paddingTop)
  }

  const calculatedTop = Math.round(container.clientHeight / 2 - buttonSize / 2)
  return Math.max(MIN_BUTTON_MARGIN, calculatedTop)
}
function calculateButtonMarginX(
  textFieldComputedStyle: CSSStyleDeclaration
): number {
  const paddingRight = parseFloat(textFieldComputedStyle.paddingRight || '0')
  return Math.max(paddingRight, MIN_BUTTON_MARGIN)
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

  if (isContentEditable(textField)) {
    insertIntoContentEditable(textField, textToInsert)
  } else {
    insertIntoTextfield(textField, textToInsert)
  }

  // Notify all listeners.
  textField.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

  focusOnTextField(textField)
}

function focusOnTextField(textField: HTMLElement) {
  try {
    textField.focus({ preventScroll: true })
  } catch (_) {
    textField.focus()
  }
}

function isContentEditable(element: HTMLElement) {
  return element.isContentEditable
}

function insertIntoTextfield(
  textField: HTMLInputElement | HTMLTextAreaElement,
  textToInsert: string
) {
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
}

function insertIntoContentEditable(element: HTMLElement, text: string) {
  const selection = window.getSelection()

  // Check if selection exists, is in range, and if the selection is within our contentEditable element
  const selectionInElement =
    selection &&
    selection.rangeCount > 0 &&
    element.contains(selection.getRangeAt(0).commonAncestorContainer)

  if (!selectionInElement) {
    // No valid selection within our element, append to end
    focusOnTextField(element)
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false) // Position at end
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  // At this point, we should have a valid selection within our element
  const range = selection?.getRangeAt(0)
  if (range) {
    // Get context around insertion point to determine if we need to add spaces
    const beforeRange = range.cloneRange()
    const afterRange = range.cloneRange()

    // Check for character before insertion point
    let needsLeadingSpace = false
    beforeRange.collapse(true)
    try {
      beforeRange.setStart(range.startContainer, 0)
      const textBefore = beforeRange.toString()
      const prevChar =
        textBefore.length > 0 ? textBefore.charAt(textBefore.length - 1) : ''
      needsLeadingSpace = prevChar !== '' && !/\s/.test(prevChar)
    } catch (err) {
      console.debug(
        'insertIntoContentEditable: Error checking text before cursor:',
        err
      )
    }

    // Check for character after insertion point
    let needsTrailingSpace = false
    afterRange.collapse(false)
    try {
      // Only try to get the next character if we can safely do so
      if (afterRange.endContainer.nodeType === Node.TEXT_NODE) {
        // For text nodes, we can safely get all text
        const textNode = afterRange.endContainer as Text
        afterRange.setEnd(textNode, textNode.length)
      } else if (afterRange.endContainer.nodeType === Node.ELEMENT_NODE) {
        // For element nodes, we need to be careful about child nodes
        const element = afterRange.endContainer as Element
        // Only expand if there's actually a node at the offset
        if (element.childNodes.length > afterRange.endOffset) {
          afterRange.setEnd(element, afterRange.endOffset + 1)
        }
      }

      const textAfter = afterRange.toString()
      const nextChar = textAfter.length > 0 ? textAfter.charAt(0) : ''
      needsTrailingSpace = nextChar !== '' && !/\s/.test(nextChar)
    } catch (err) {
      console.debug(
        'insertIntoContentEditable: Error checking text after cursor:',
        err
      )
    }

    // Add whitespace as needed
    const formattedText =
      (needsLeadingSpace ? ' ' : '') + text + (needsTrailingSpace ? ' ' : '')

    try {
      range.deleteContents()
      const textNode = document.createTextNode(formattedText)
      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.setEndAfter(textNode)
      selection?.removeAllRanges()
      selection?.addRange(range)
    } catch (err) {
      console.debug('insertIntoContentEditable: Error inserting text:', err)
      // Fallback: try to just focus and append text
      focusOnTextField(element)
      element.textContent = (element.textContent || '') + formattedText
    }
  }
}
