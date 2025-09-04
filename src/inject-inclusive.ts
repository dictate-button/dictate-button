import { injectDictateButtonOnLoad } from './libs/injectDictateButtonOnLoad'

const BUTTON_SIZE = 30 // px
const BUTTON_MARGIN = 10 // px
const WATCH_DOM_CHANGES = true
const VERBOSE = false
const TEXT_FIELD_SELECTOR = [
  'textarea:not([data-dictate-button-off]):not([data-dictate-button-enabled])',
  'input[type="text"]:not([data-dictate-button-off]):not([data-dictate-button-enabled])',
  'input[type="search"]:not([data-dictate-button-off]):not([data-dictate-button-enabled])',
  'input:not([type]):not([data-dictate-button-off]):not([data-dictate-button-enabled])',
].join(',')

injectDictateButtonOnLoad(TEXT_FIELD_SELECTOR, {
  buttonSize: BUTTON_SIZE,
  buttonMargin: BUTTON_MARGIN,
  watchDomChanges: WATCH_DOM_CHANGES,
  verbose: VERBOSE,
})
