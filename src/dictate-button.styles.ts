export const dictateButtonStyles = `
:host([theme="dark"]) {
  color-scheme: only dark;
}
:host([theme="light"]) {
  color-scheme: only light;
}

:host .dictate-button__container {
  margin: 5px;
}

:host .dictate-button__button {
  cursor: pointer;
  padding: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s ease-in-out;
  border-radius: 50%;
  border: 12px solid transparent;
  box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.3);
  transition: box-shadow 0.05s linear;
}

:host .dictate-button__button .dictate-button__icon {
  width: 100%;
  height: 100%;
}

:host .dictate-button__button .dictate-button__icon.dictate-button__icon--processing {
  animation: dictate-button-rotate 1s linear infinite;
}

@keyframes dictate-button-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`
