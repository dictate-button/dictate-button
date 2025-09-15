import { injectDictateButtonFloating } from './libs/injectDictateButtonFloating'

// 1. Save the last focused text field reference with selected range in memory. Or alternatively add data-dictate-button-on.
// 2. Use that reference to insert the resulting transcription.
// 3. Place the dictate button to the central bottom position on the page.
// 4. Increase the button size to 50px.

const BUTTON_SIZE = 50 // px
const VERBOSE = true
const TEXT_FIELD_SELECTOR = [
  'textarea[data-dictate-button-on]:not([data-dictate-button-enabled])',
  'input[type="text"][data-dictate-button-on]:not([data-dictate-button-enabled])',
  'input[type="search"][data-dictate-button-on]:not([data-dictate-button-enabled])',
  'input[data-dictate-button-on]:not([type]):not([data-dictate-button-enabled])',
].join(',')

injectDictateButtonOnLoad(TEXT_FIELD_SELECTOR, {
  buttonSize: BUTTON_SIZE,
  verbose: VERBOSE,
})

export function injectDictateButtonOnLoad(
  textFieldSelector: string,
  options: {}
) {
  const run = () => {
    injectDictateButtonFloating(textFieldSelector, options)
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true })
  } else {
    run()
  }
}
