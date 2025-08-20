const BUTTON_SIZE = 30 // px
const BUTTON_MARGIN = 10 // px
const WATCH_DOM_CHANGES = true
const TEXT_FIELD_SELECTOR =
  'textarea:not([data-dictate-button-off]):not([data-dictate-button-enabled]), input[type="text"]:not([data-dictate-button-off]):not([data-dictate-button-enabled])'

export function injectDictateButton() {
  const textFields = document.querySelectorAll(TEXT_FIELD_SELECTOR)

  for (const textField of textFields) {
    // Add a wrapper div with relative positioning.
    const container = document.createElement('div')
    container.style.position = 'relative'
    container.style.display = 'inline-block'
    container.style.width = 'auto'
    container.style.color = 'inherit'
    textField.parentNode.insertBefore(container, textField)

    textField.setAttribute('data-dictate-button-enabled', '')

    container.appendChild(textField)

    // Ensure textarea fills container
    textField.style.boxSizing = 'border-box'

    // Add the dictate-button component.
    const dictateBtn = document.createElement('dictate-button')
    dictateBtn.size = BUTTON_SIZE
    dictateBtn.style.position = 'absolute'
    dictateBtn.style.right = '0'
    dictateBtn.style.top =
      calculateButtonPositionTop(container, textField) + 'px'
    dictateBtn.style.margin = BUTTON_MARGIN + 'px'

    // Set document language as the dictate-button component's language.
    const lang = document.documentElement.lang
    if (lang && lang.length === 2) {
      dictateBtn.language = lang
    }

    // Add event listeners for the dictate-button component.
    dictateBtn.addEventListener('recording:started', (e) => {
      console.log('recording:started', e)
    })
    dictateBtn.addEventListener('recording:stopped', (e) => {
      console.log('recording:stopped', e)
    })
    dictateBtn.addEventListener('recording:failed', (e) => {
      console.log('recording:failed', e)
    })

    dictateBtn.addEventListener('transcribing:started', (e) => {
      console.log('transcribing:started', e)
    })
    dictateBtn.addEventListener('transcribing:finished', (e) => {
      console.log('transcribing:finished', e)
      const customEvent = e
      const text = customEvent.detail
      receiveText(textField, text)
    })
    dictateBtn.addEventListener('transcribing:failed', (e) => {
      console.log('transcribing:failed', e)
    })

    container.appendChild(dictateBtn)
  }
}

function calculateButtonPositionTop(container, textField) {
  if (textField.tagName.toLowerCase() === 'textarea') {
    return 0
  }

  const calculatedTop = Math.round(
    container.clientHeight / 2 - BUTTON_SIZE / 2 - BUTTON_MARGIN
  )
  return Math.max(0, calculatedTop)
}

function receiveText(textField, text) {
  const textToInsert = text.trim()

  // Ignore empty transcriptions.
  if (textToInsert.length === 0) {
    return
  }

  const start = textField.selectionStart || 0
  const end = textField.selectionEnd || 0

  // Check if we need to add whitespace before the text.
  const needsLeadingSpace =
    start > 0 &&
    !textField.value.substring(start - 1, start).match(/\s/) &&
    !textToInsert.startsWith(' ')

  // Check if we need to add whitespace after the text.
  const needsTrailingSpace =
    end < textField.value.length &&
    !textField.value.substring(end, end + 1).match(/\s/) &&
    !textToInsert.endsWith(' ')

  // Add whitespace as needed.
  const formattedText =
    (needsLeadingSpace ? ' ' : '') +
    textToInsert +
    (needsTrailingSpace ? ' ' : '')

  textField.value =
    textField.value.substring(0, start) +
    formattedText +
    textField.value.substring(end)
}

document.addEventListener('DOMContentLoaded', () => {
  injectDictateButton()
  if (WATCH_DOM_CHANGES) {
    new MutationObserver(injectDictateButton).observe(document.body, {
      childList: true,
      subtree: true,
    })
  }
})
