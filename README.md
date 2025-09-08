# Dictate Button (Web Component)
![NPM Version](https://img.shields.io/npm/v/dictate-button)

A customizable web component that adds speech-to-text dictation capabilities to any text input or textarea field on your website.

Developed for [dictate-button.io](https://dictate-button.io).

## Features

- Easy integration with any website
- Compatible with any framework (or no framework)
- Automatic injection into any textarea or text input with the `data-dictate-button-on` attribute (exclusive mode) or without the `data-dictate-button-off` attribute (inclusive mode)
- Simple speech-to-text functionality with clean UI
- Customizable size and API endpoint
- Dark and light theme support
- Event-based API for interaction with your application
- Built with SolidJS for optimal performance
- Accessibility is ensured with ARIA attributes, high-contrast mode support, and clear keyboard focus states

## Supported tags (by our inject scripts)

- textarea
- input[type="text"]
- input[type="search"]
- input (without a type; defaults to text)

## Usage

### Auto-inject modes

Choose the auto-inject mode that best suits your needs:

| Mode | Description | Scripts |
|---|---|---|
| Exclusive | Enables for text fields with the `data-dictate-button-on` attribute only. | `inject-exclusive.js` |
| Inclusive | Enables for text fields without the `data-dictate-button-off` attribute. | `inject-inclusive.js` |

Both auto-inject modes:
- Automatically run on DOMContentLoaded (or immediately if the DOM is already loaded).
- Watch for DOM changes to apply the dictate button to newly added elements.
- Set the button’s language from `document.documentElement.lang` (if present). Long codes like `en-GB` are normalized to `en`.
- Position the button to the right top corner of the text field respecting its padding with 4px fallback is the padding is not set (0).

### From CDN

#### Option 1: Using the exclusive auto-inject script

In your HTML `<head>` tag, add the following script tags:

```html
<script type="module" crossorigin src="https://cdn.dictate-button.io/dictate-button.js"></script>
<script type="module" crossorigin src="https://cdn.dictate-button.io/inject-exclusive.js"></script>
```

Add the `data-dictate-button-on` attribute to any `textarea`, `input[type="text"]`, `input[type="search"]`, or `input` without a `type` attribute:

```html
<textarea data-dictate-button-on></textarea>
<input type="text" data-dictate-button-on />
<input type="search" data-dictate-button-on />
<input data-dictate-button-on />
```

#### Option 2: Using the inclusive auto-inject script

In your HTML `<head>` tag, add the following script tags:

```html
<script type="module" crossorigin src="https://cdn.dictate-button.io/dictate-button.js"></script>
<script type="module" crossorigin src="https://cdn.dictate-button.io/inject-inclusive.js"></script>
```

All `textarea`, `input[type="text"]`, `input[type="search"]`, and `input` elements without a `type` attribute that lack `data-dictate-button-off` will be automatically enhanced by default.

To disable that for a specific field, add the `data-dictate-button-off` attribute to it this way:

```html
<textarea data-dictate-button-off></textarea>
<input type="text" data-dictate-button-off />
<input type="search" data-dictate-button-off />
<input data-dictate-button-off />
```

#### Option 3: Manual integration

Import the component and use it directly in your code:

```html
<script type="module" crossorigin src="https://cdn.dictate-button.io/dictate-button.js"></script>

<dictate-button size="30" api-endpoint="https://api.dictate-button.io/transcribe" language="en"></dictate-button>
```

### From NPM

Import once for your app.

The button component:

```js
import 'dictate-button'
```

The auto-inject script:

```js
// For selected text fields (with data-dictate-button-on attribute):
import 'dictate-button/inject-exclusive'
// or for all text fields (except those with data-dictate-button-off attribute):
import 'dictate-button/inject-inclusive'
```

To choose between **exclusive** and **inclusive** auto-inject modes, see the [Auto-inject modes](#auto-inject-modes) section.

### Advanced usage with library functions

If you need more control over when and how the dictate buttons are injected, you can use the library functions directly:

Tip: You can also import from subpaths (e.g., 'dictate-button/libs/injectDictateButton')
for smaller bundles, if your bundler resolves package subpath exports.

```js
import { injectDictateButton, injectDictateButtonOnLoad } from 'dictate-button/libs'

// Inject dictate buttons immediately to matching elements
injectDictateButton(
  'textarea.custom-selector', // CSS selector for target elements
  {
    buttonSize: 30,           // Button size in pixels (optional; default: 30)
    verbose: false,           // Log events to console (optional; default: false)
    customApiEndpoint: 'https://api.example.com/transcribe' // Optional custom API endpoint
  }
)

// Inject on DOM load with mutation observer to catch dynamically added elements
injectDictateButtonOnLoad(
  'input.custom-selector',    // CSS selector for target elements
  {
    buttonSize: 30,           // Button size in pixels (optional; default: 30)
    watchDomChanges: true,    // Watch for DOM changes (optional; default: false)
    verbose: false,           // Log events to console (optional; default: false)
    customApiEndpoint: 'https://api.example.com/transcribe' // Optional custom API endpoint
  }
)
```

Note: the injector mirrors the target field’s display/margins into the wrapper, 
sets wrapper width to 100% for block-level fields, and adds padding to avoid the button overlapping text.
The wrapper also has the `dictate-button-wrapper` class for easy styling.

## Events

The dictate-button component emits the following events:

- `recording:started`: Fired when user starts recording.
- `recording:stopped`: Fired when user stops recording.
- `recording:failed`: Fired when an error occurs during recording.
- `transcribing:started`: Fired when transcribing is started.
- `transcribing:finished`: Fired when transcribing is complete. The event detail contains the transcribed text.
- `transcribing:failed`: Fired when an error occurs during transcribing.

Example event handling:

```javascript
const dictateButton = document.querySelector('dictate-button');

dictateButton.addEventListener('transcribing:finished', (event) => {
  const transcribedText = event.detail;
  console.log('Transcribed text:', transcribedText);
  
  // Add the text to your input field
  document.querySelector('#my-input').value += transcribedText;
});
```

## Attributes

| Attribute     | Type    | Default                                 | Description                            |
|---------------|---------|-----------------------------------------|----------------------------------------|
| size          | number  | 30                                      | Size of the button in pixels           |
| apiEndpoint   | string  | https://api.dictate-button.io/transcribe| API endpoint for transcription service |
| language      | string  | (not set)                               | Optional language code (e.g., 'en', 'fr', 'de') which may speed up the transcription. |
| theme         | string  | (inherits from page)                    | 'light' or 'dark'                      |
| class         | string  |                                         | Custom CSS class                       |

## Styling

You can customize the appearance of the dictate button using CSS parts:

```css
/* Style the button container */
dictate-button::part(container) {
  /* Custom styles */
}

/* Style the button itself */
dictate-button::part(button) {
  /* Custom styles */
}

/* Style the button icons */
dictate-button::part(icon) {
  /* Custom styles */
}
```

## API Endpoint

By default, dictate-button uses the `https://api.dictate-button.io/transcribe` endpoint for speech-to-text conversion. 
You can specify your own endpoint by setting the `apiEndpoint` attribute.

The API expects:
- POST request
- Multipart form data with the following fields:
  - `audio`: Audio data as a Blob (audio/webm format)
  - `origin`: The origin of the website (automatically added)
  - `language`: Optional language code (if provided as an attribute)
- Response should be JSON with a `text` property containing the transcribed text

## Browser Compatibility

The dictate-button component requires the following browser features:
- Web Components
- MediaRecorder API
- Fetch API

Works in all modern browsers (Chrome, Firefox, Safari, Edge).
