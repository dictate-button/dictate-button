const BUTTONS_SIZE = 24 // px
const WATCH_DOM_CHANGES = true

function injectDictateButton() {
  const textFields = document.querySelectorAll(
    'textarea[data-dictate-button-on]:not([data-dictate-button-enabled]), input[type="text"][data-dictate-button-on]:not([data-dictate-button-enabled]), textarea[data-dictate-button-target]:not([data-dictate-button-enabled]), input[type="text"][data-dictate-button-target]:not([data-dictate-button-enabled])'
  )

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
    // textarea.style.paddingRight = `${BUTTONS_SIZE + 2 * 2 + 6}px`

    // Add the dictate-button component.
    const dictateBtn = document.createElement('dictate-button')
    dictateBtn.size = BUTTONS_SIZE
    dictateBtn.style.position = 'absolute'
    dictateBtn.style.right = '0'
    dictateBtn.style.top = '0'

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

function receiveText(textField, text) {
  const start = textField.selectionStart || 0
  const end = textField.selectionEnd || 0
  textField.value =
    textField.value.substring(0, start) + text + textField.value.substring(end)
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
