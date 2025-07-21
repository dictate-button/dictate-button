export const btnDictateStyles = `
:host([theme="dark"]) {
  color-scheme: only dark;
}
:host([theme="light"]) {
  color-scheme: only light;
}

:host .btn-dictate__container {
  margin: 5px;
}

:host .btn-dictate__button {
  cursor: pointer;
  padding: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s ease-in-out;
}

:host .btn-dictate__button .btn-dictate__icon {
  width: 100%;
  height: 100%;
}

:host .btn-dictate__button .btn-dictate__icon.btn-dictate__icon--processing {
  animation: btn-dictate-rotate 1s linear infinite;
}

@keyframes btn-dictate-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`
