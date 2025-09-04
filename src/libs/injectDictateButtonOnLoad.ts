import { injectDictateButton } from './injectDictateButton'

/**
 * Add a DOMContentLoaded event listener which injects the dictate-button component to text fields 
 * or run it immediately if DOM is already loaded.
 * 
 * Optionally watch for DOM changes to re-inject the component.
 * 
 * Optionally log button events to the console (verbose mode).
 *
 * @param {string} textFieldSelector
 * @param {number} buttonSize
 * @param {number} buttonMargin
 * @param {boolean} watchDomChanges
 * @param {boolean} verbose
 */
export function injectDictateButtonOnLoad(
  textFieldSelector: string,
  buttonSize: number,
  buttonMargin: number,
  watchDomChanges: boolean = false,
  verbose: boolean = false
) {
  const run = () => {
    injectDictateButton(textFieldSelector, buttonSize, buttonMargin, verbose)
    if (watchDomChanges && document.body) {
      const observer = new MutationObserver(() => {
        injectDictateButton(
          textFieldSelector,
          buttonSize,
          buttonMargin,
          verbose
        )
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true })
  } else {
    run()
  }
}
