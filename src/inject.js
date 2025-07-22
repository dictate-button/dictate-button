const BUTTONS_SIZE = 24 // px
const WATCH_DOM_CHANGES = true

export function injectDictateButton() {
  const textFields = document.querySelectorAll(
    'textarea[data-dictate-button-target]:not([data-dictate-button-enabled]), input[type="text"][data-dictate-button-target]:not([data-dictate-button-enabled])'
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

    // Add event listeners for the dictate-button component.
    dictateBtn.addEventListener('started', (e) => {
      console.log('started', e)
    })
    dictateBtn.addEventListener('completed', (e) => {
      console.log('completed', e)
      const customEvent = e
      const text = customEvent.detail
      receiveText(textField, text)
    })
    dictateBtn.addEventListener('cancelled', (e) => {
      console.log('cancelled', e)
    })
    dictateBtn.addEventListener('error', (e) => {
      console.log('error', e)
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
