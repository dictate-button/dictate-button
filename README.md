# Dictate Button (Web Component)

A customizable web component that adds speech-to-text dictation capabilities to any text input or textarea field on your website.

## Features

- Easy integration with any website
- Compatible with any framework (or no framework)
- Automatic injection into any textarea or text input with the `data-dictate-button-target` attribute
- Simple speech-to-text functionality with clean UI
- Customizable size and API endpoint
- Dark and light theme support
- Event-based API for interaction with your application
- Built with SolidJS for optimal performance

## Usage

### From CDN

#### Option 1: Using the auto-inject script

Include the inject script in your HTML:

```html
<script type="module" crossorigin src="https://cdn.dictate-button.io/dictate-button.es.js"></script>
<script type="module" crossorigin src="https://cdn.dictate-button.io/inject.es.js"></script>
```

Add the `data-dictate-button-target` attribute to any textarea or text input where you want the dictate button to appear:

```html
<textarea data-dictate-button-target></textarea>
<input type="text" data-dictate-button-target />
```

#### Option 2: Manual integration

Import the component and use it directly in your code:

```html
<script type="module" crossorigin src="https://cdn.dictate-button.io/dictate-button.es.js"></script>

<dictate-button size="24" api-endpoint="https://api.dictate-button.io/transcribe"></dictate-button>
```

### From NPM

Import once for your app.

The button component:

```js
import 'dictate-button'
```

The auto-inject script:

```js
import 'dictate-button/inject'
```

## Events

The dictate-button component emits the following events:

- `recording-started`: Fired when user starts recording.
- `recording-stopped`: Fired when user stops recording.
- `recording-error`: Fired when an error occurs during recording.
- `transcribing-started`: Fired when transcribing is started.
- `transcribing-finished`: Fired when transcribing is complete. The event detail contains the transcribed text.
- `transcribing-error`: Fired when an error occurs during transcribing.

Example event handling:

```javascript
const dictateButton = document.querySelector('dictate-button');

dictateButton.addEventListener('transcribing-finished', (event) => {
  const transcribedText = event.detail;
  console.log('Transcribed text:', transcribedText);
  
  // Add the text to your input field
  document.querySelector('#my-input').value += transcribedText;
});
```

## Attributes

| Attribute     | Type    | Default                                 | Description                            |
|---------------|---------|-----------------------------------------|----------------------------------------|
| size          | number  | 24                                      | Size of the button in pixels           |
| apiEndpoint   | string  | https://api.dictate-button.io/transcribe| API endpoint for transcription service |
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

By default, dictate-button uses the `https://api.dictate-button.io/transcribe` endpoint for speech-to-text conversion. You can specify your own endpoint by setting the `apiEndpoint` attribute.

The API expects:
- POST request
- Audio data as a Blob (audio/webm format)
- Response should be JSON with a `text` property containing the transcribed text

## Browser Compatibility

The dictate-button component requires modern browser features:
- Web Components
- MediaRecorder API
- Fetch API

Works in all modern browsers (Chrome, Firefox, Safari, Edge).

## License

!!! TBD
