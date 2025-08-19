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

## Usage

### Auto-inject modes

Choose the auto-inject mode that best suits your needs:

| Mode | Description | Scripts |
|---|---|---|
| Exclusive | Enables for `textarea` and `input[type=text]` with the `data-dictate-button-on` attribute only. | `inject-exclusive.js` |
| Inclusive | Enables for all `textarea` and `input[type=text]` without the `data-dictate-button-off` attribute. | `inject-inclusive.js` |

### From CDN

#### Option 1: Using the exclusive auto-inject script

In your HTML `<head>` tag, add the following script tags:

```html
<script type="module" crossorigin src="https://cdn.dictate-button.io/dictate-button.js"></script>
<script type="module" crossorigin src="https://cdn.dictate-button.io/inject-exclusive.js"></script>
```

Add the `data-dictate-button-on` attribute to any `textarea` or `input[type=text]` elements where you want the dictate button to appear:

```html
<textarea data-dictate-button-on></textarea>
<input type="text" data-dictate-button-on />
```

#### Option 2: Using the inclusive auto-inject script

In your HTML `<head>` tag, add the following script tags:

```html
<script type="module" crossorigin src="https://cdn.dictate-button.io/dictate-button.js"></script>
<script type="module" crossorigin src="https://cdn.dictate-button.io/inject-inclusive.js"></script>
```

All `textarea` and `input[type=text]` elements without the `data-dictate-button-off` attribute will be automatically enhanced with the dictate button by default.

To disable that for a specific field, add the `data-dictate-button-off` attribute to it this way:

```html
<textarea data-dictate-button-off></textarea>
<input type="text" data-dictate-button-off />
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
