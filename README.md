# Dictate Button
[![NPM Version](https://img.shields.io/npm/v/dictate-button)](https://www.npmjs.com/package/dictate-button)
[![Tests](https://github.com/dictate-button/dictate-button/actions/workflows/test.yml/badge.svg)](https://github.com/dictate-button/dictate-button/actions/workflows/test.yml)

A customizable web component that adds speech-to-text dictation capabilities to any text input, textarea field, or contenteditable element on your website.

Developed for [dictate-button.io](https://dictate-button.io).

## Features

- Easy integration with any website
- Compatible with any framework (or no framework)
- Automatic injection into text fields with the `data-dictate-button-on` attribute (exclusive mode) or without the `data-dictate-button-off` attribute (inclusive mode)
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
- [contenteditable] elements

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
- Position the button to the top right-hand corner of the text field, respecting its padding with 4px fallback if the padding is not set (0).

### From CDN

#### Option 1: Using the exclusive auto-inject script

In your HTML `<head>` tag, add the following script tag:

```html
<script type="module" crossorigin src="https://cdn.dictate-button.io/inject-exclusive.js"></script>
```

Add the `data-dictate-button-on` attribute to any `textarea`, `input[type="text"]`, `input[type="search"]`, `input` without a `type` attribute, or element with the `contenteditable` attribute:

```html
<textarea data-dictate-button-on></textarea>
<input type="text" data-dictate-button-on />
<input type="search" data-dictate-button-on />
<input data-dictate-button-on />
<div contenteditable data-dictate-button-on />
```

#### Option 2: Using the inclusive auto-inject script

In your HTML `<head>` tag, add the following script tag:

```html
<script type="module" crossorigin src="https://cdn.dictate-button.io/inject-inclusive.js"></script>
```

All `textarea`, `input[type="text"]`, `input[type="search"]`, `input` elements without a `type` attribute, and elements with the `contenteditable` attribute that lack `data-dictate-button-off` will be automatically enhanced by default.

To disable that for a specific field, add the `data-dictate-button-off` attribute to it this way:

```html
<textarea data-dictate-button-off></textarea>
<input type="text" data-dictate-button-off />
<input type="search" data-dictate-button-off />
<input data-dictate-button-off />
<div contenteditable data-dictate-button-off />
```

#### Option 3: Manual integration

Import the component and use it directly in your code:

```html
<script type="module" crossorigin src="https://cdn.dictate-button.io/dictate-button.js"></script>

<dictate-button size="30" api-endpoint="wss://api.dictate-button.io/v2/transcribe" language="en"></dictate-button>
```

### From NPM

Import once for your app:

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
import 'dictate-button' // Required when using library functions directly
import { injectDictateButton, injectDictateButtonOnLoad } from 'dictate-button/libs'

// Inject dictate buttons immediately to matching elements
injectDictateButton(
  'textarea.custom-selector', // CSS selector for target elements
  {
    buttonSize: 30,           // Button size in pixels (optional; default: 30)
    verbose: false,           // Log events to console (optional; default: false)
    apiEndpoint: 'wss://api.example.com/transcribe' // Optional custom API endpoint
  }
)

// Inject on DOM load with mutation observer to catch dynamically added elements
injectDictateButtonOnLoad(
  'input.custom-selector',    // CSS selector for target elements
  {
    buttonSize: 30,           // Button size in pixels (optional; default: 30)
    verbose: false,           // Log events to console (optional; default: false)
    apiEndpoint: 'wss://api.example.com/transcribe', // Optional custom API endpoint
    watchDomChanges: true     // Watch for DOM changes (optional; default: false)
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

The ideal scenario is when user first starts recording (`recording:started`), then stops recording (`recording:stopped`), then the recorded audio is sent to the server for processing (`transcribing:started`), and finally the transcribed text is received (`transcribing:finished`).

> recording:started -> recording:stopped -> transcribing:started -> transcribing:finished

In case of an error in recording or transcribing, the `recording:failed` or `transcribing:failed` event is fired, respectively.

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

| Attribute     | Type    | Default                                    | Description                            |
|---------------|---------|--------------------------------------------|-----------------------------------------|
| size          | number  | 30                                         | Size of the button in pixels           |
| apiEndpoint   | string  | wss://api.dictate-button.io/v2/transcribe  | WebSockets API endpoint of transcription service |
| language      | string  | en                                         | Optional [language](/wiki/Supported-Languages-and-Dialects) code (e.g., 'fr', 'de') |
| theme         | string  | (inherits from page)                       | 'light' or 'dark'                      |
| class         | string  |                                            | Custom CSS class                       |

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

By default, dictate-button uses the `wss://api.dictate-button.io/v2/transcribe` endpoint for real-time speech-to-text streaming.
You can specify your own endpoint by setting the `apiEndpoint` attribute.

The API uses WebSocket for real-time transcription:
- **Protocol**: WebSocket (wss://)
- **Connection**: Opens WebSocket connection with optional language query parameter (e.g., `?language=en`)
- **Audio Format**: PCM16 audio data at 16kHz sample rate, sent as binary chunks
- **Messages Sent**:
  - Binary audio data (Int16Array buffers) - Continuous stream of PCM16 audio chunks
  - `{ type: 'close' }` - JSON message to signal end of audio stream and trigger finalization
- **Messages Received**: JSON messages with the following types:
  - `{ type: 'session_opened', sessionId: string, expiresAt: number }` - Session started
  - `{ type: 'interim_transcript', text: string }` - Interim (partial) transcription result that may change as more audio is processed
  - `{ type: 'transcript', text: string, turn_order?: number }` - Final transcription result for the current turn
  - `{ type: 'session_closed', code: number, reason: string }` - Session ended
  - `{ type: 'error', error: string }` - Error occurred

## Browser Compatibility

The dictate-button component requires the following browser features:
- Web Components
- MediaStream API (getUserMedia)
- Web Audio API (AudioContext, AudioWorklet)
- WebSocket API

Works in all modern browsers (Chrome, Firefox, Safari, Edge).
