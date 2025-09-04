import { injectDictateButton } from './injectDictateButton'

/**
 * Add a DOMContentLoaded event listener which injects the dictate-button component to text fields,
 * and optionally watch for DOM changes to re-inject the component.
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
  document.addEventListener('DOMContentLoaded', () => {
    injectDictateButton(textFieldSelector, buttonSize, buttonMargin, verbose)
    if (watchDomChanges) {
      new MutationObserver(() =>
        injectDictateButton(
          textFieldSelector,
          buttonSize,
          buttonMargin,
          verbose
        )
      ).observe(document.body, {
        childList: true,
        subtree: true,
      })
    }
  })
}
