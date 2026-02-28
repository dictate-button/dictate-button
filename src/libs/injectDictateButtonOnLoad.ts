import type { InjectDictateButtonOptions } from './injectDictateButton'
import { injectDictateButton } from './injectDictateButton'

/**
 * Options for injecting the dictate button on load, extends the base options.
 */
export interface InjectDictateButtonOnLoadOptions
  extends InjectDictateButtonOptions {
  /** Whether to watch for DOM changes and re-inject the component */
  watchDomChanges?: boolean
}

/**
 * Add a DOMContentLoaded event listener which injects the dictate-button component to text fields
 * or run it immediately if DOM is already loaded.
 *
 * Optionally watch for DOM changes to re-inject the component.
 *
 * Optionally log button events to the console (verbose mode).
 *
 * @param {string} textFieldSelector - CSS selector for text fields to enhance
 * @param {InjectDictateButtonOnLoadOptions} options - Configuration options
 */
export function injectDictateButtonOnLoad(
  textFieldSelector: string,
  options: InjectDictateButtonOnLoadOptions = {}
) {
  const { watchDomChanges = false } = options

  const run = () => {
    injectDictateButton(textFieldSelector, options)
    if (watchDomChanges && document.body) {
      const observer = new MutationObserver(() => {
        injectDictateButton(textFieldSelector, options)
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
