// The implementation follows a global approach where one floating button serves all text fields on the page,
// eliminating the need for individual buttons per field.

import type { DictateButtonProps } from './dictate-button'

const BUTTON_SIZE = 50 // px
const VERBOSE = true

// Global state for tracking focused text field
let lastFocusedField: {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement
  selectionStart?: number
  selectionEnd?: number
} | null = null

injectFloatingDictateButton({
  buttonSize: BUTTON_SIZE,
  verbose: VERBOSE,
})

interface FloatingDictateButtonOptions {
  buttonSize?: number
  verbose?: boolean
  customApiEndpoint?: string
}

export function injectFloatingDictateButton(
  options: FloatingDictateButtonOptions = {}
) {
  const run = () => {
    setupFocusTracking()
    createFloatingButton(options)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true })
  } else {
    run()
  }
}

function setupFocusTracking() {
  // Track focus on text fields
  document.addEventListener('focusin', (event) => {
    const target = event.target as HTMLElement

    if (isTextField(target)) {
      const textField = target as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLElement

      // Save current selection for input/textarea elements
      let selectionStart: number | undefined
      let selectionEnd: number | undefined

      if ('selectionStart' in textField && 'selectionEnd' in textField) {
        selectionStart = textField.selectionStart ?? 0
        selectionEnd = textField.selectionEnd ?? 0
      }

      lastFocusedField = {
        element: textField,
        selectionStart,
        selectionEnd,
      }

      // Mark field as ready for dictation
      textField.setAttribute('data-dictate-button-on', 'true')

      VERBOSE && console.debug('Focus tracked on text field:', textField)
    }
  })

  // Update selection when it changes
  document.addEventListener('selectionchange', () => {
    if (lastFocusedField && 'selectionStart' in lastFocusedField.element) {
      const element = lastFocusedField.element as
        | HTMLInputElement
        | HTMLTextAreaElement
      lastFocusedField.selectionStart = element.selectionStart ?? 0
      lastFocusedField.selectionEnd = element.selectionEnd ?? 0
    }
  })
}

function isTextField(element: HTMLElement): boolean {
  if (!element) return false

  const tagName = element.tagName.toLowerCase()

  // Check for textarea
  if (tagName === 'textarea') return true

  // Check for input types
  if (tagName === 'input') {
    const type = (element as HTMLInputElement).type.toLowerCase()
    return ['text', 'search'].includes(type) || !type
  }

  // Check for contenteditable
  return isContentEditable(element)
}

function isContentEditable(element: HTMLElement): boolean {
  console.log('isContentEditable', element.isContentEditable)
  return element.isContentEditable
}

function createFloatingButton(options: FloatingDictateButtonOptions) {
  const { buttonSize = 50, verbose = false, customApiEndpoint } = options

  // Check if button already exists
  if (document.querySelector('#floating-dictate-button')) {
    return
  }

  // Create the dictate-button element
  const dictateBtn = document.createElement('dictate-button') as HTMLElement &
    DictateButtonProps
  dictateBtn.id = 'floating-dictate-button'
  dictateBtn.size = buttonSize
  dictateBtn.style.position = 'fixed'
  dictateBtn.style.left = '50%'
  dictateBtn.style.bottom = '20px'
  dictateBtn.style.transform = 'translateX(-50%)'
  dictateBtn.style.zIndex = '10000'

  if (customApiEndpoint) {
    dictateBtn.apiEndpoint = customApiEndpoint
  }

  // Set document language
  dictateBtn.language = getDocumentLanguage()

  // Add click handler to check for target field
  dictateBtn.addEventListener(
    'click',
    (e) => {
      if (!lastFocusedField) {
        e.preventDefault()
        e.stopPropagation()
        alert('Select a target text field first please')
        return
      }
    },
    { capture: true }
  )

  // Add event listeners
  dictateBtn.addEventListener('recording:started', (e) => {
    verbose && console.debug('recording:started', e)
  })

  dictateBtn.addEventListener('recording:stopped', (e) => {
    verbose && console.debug('recording:stopped', e)
  })

  dictateBtn.addEventListener('recording:failed', (e) => {
    verbose && console.debug('recording:failed', e)
    focusLastTextField()
  })

  dictateBtn.addEventListener('transcribing:started', (e) => {
    verbose && console.debug('transcribing:started', e)
  })

  dictateBtn.addEventListener('transcribing:finished', (e) => {
    verbose && console.debug('transcribing:finished', e)
    const text = (e as CustomEvent<string>).detail
    insertTextIntoLastFocusedField(text)
  })

  dictateBtn.addEventListener('transcribing:failed', (e) => {
    verbose && console.debug('transcribing:failed', e)
    focusLastTextField()
  })

  // Add button to page
  document.body.appendChild(dictateBtn)
}

function getDocumentLanguage(): string | undefined {
  const lang = document.documentElement.lang
  if (lang && lang.length >= 2) {
    try {
      const hasIntlLocale = (Intl as any)?.Locale
      const locale = hasIntlLocale ? new Intl.Locale(lang) : null
      return locale?.language ?? lang.split(/[-_]/)[0].toLowerCase()
    } catch {
      return lang.split(/[-_]/)[0].toLowerCase()
    }
  }
}

function insertTextIntoLastFocusedField(text: unknown) {
  if (!lastFocusedField) {
    if (VERBOSE) {
      console.debug('No last focused field to insert text into')
    }
    return
  }

  const textToInsert =
    typeof text === 'string' ? text.trim() : String(text ?? '').trim()

  if (textToInsert.length === 0) {
    return
  }

  const element = lastFocusedField.element

  // Handle contenteditable elements
  if (isContentEditable(element)) {
    insertIntoContentEditable(element, textToInsert)
    return
  }

  // Handle input/textarea elements
  if ('value' in element) {
    const textField = element as HTMLInputElement | HTMLTextAreaElement
    const start = lastFocusedField.selectionStart ?? 0
    const end = lastFocusedField.selectionEnd ?? 0

    // Check for whitespace needs
    const prevChar = start > 0 ? textField.value.charAt(start - 1) : ''
    const needsLeadingSpace = prevChar && !/\s/.test(prevChar)

    const nextChar =
      end < textField.value.length ? textField.value.charAt(end) : ''
    const needsTrailingSpace = nextChar && !/\s/.test(nextChar)

    const formattedText =
      (needsLeadingSpace ? ' ' : '') +
      textToInsert +
      (needsTrailingSpace ? ' ' : '')

    // Insert text
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
        lastFocusedField.selectionStart = newCaretPos
        lastFocusedField.selectionEnd = newCaretPos
      } catch (_) {
        // Some inputs may not support selection
      }
    }

    if (prevScrollTop !== null) {
      textField.scrollTop = prevScrollTop
    }

    // Dispatch input event
    textField.dispatchEvent(
      new Event('input', { bubbles: true, composed: true })
    )
  }

  focusLastTextField()
}

function insertIntoContentEditable(element: HTMLElement, text: string) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    // No selection, append to end
    element.focus()
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  // Insert text at current selection
  const range = selection?.getRangeAt(0)
  if (range) {
    range.deleteContents()
    const textNode = document.createTextNode(text)
    range.insertNode(textNode)
    range.setStartAfter(textNode)
    range.setEndAfter(textNode)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  // Dispatch input event
  element.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
}

function focusLastTextField() {
  if (lastFocusedField?.element) {
    try {
      lastFocusedField.element.focus({ preventScroll: true })
    } catch (_) {
      lastFocusedField.element.focus()
    }
  }
}
