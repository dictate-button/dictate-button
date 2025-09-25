import { injectDictateButtonOnLoad } from './libs/injectDictateButtonOnLoad'

const BUTTON_SIZE = 30 // px
const WATCH_DOM_CHANGES = true
const VERBOSE = false
const TEXT_FIELD_SELECTOR = [
  'textarea[data-dictate-button-on]:not([data-dictate-button-enabled])',
  'input[type="text"][data-dictate-button-on]:not([data-dictate-button-enabled])',
  'input[type="search"][data-dictate-button-on]:not([data-dictate-button-enabled])',
  'input[data-dictate-button-on]:not([type]):not([data-dictate-button-enabled])',
  '*[contenteditable][data-dictate-button-on]:not([data-dictate-button-enabled])',
].join(',')

injectDictateButtonOnLoad(TEXT_FIELD_SELECTOR, {
  buttonSize: BUTTON_SIZE,
  watchDomChanges: WATCH_DOM_CHANGES,
  verbose: VERBOSE,
})
