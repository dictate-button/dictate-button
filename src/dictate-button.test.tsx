import { describe, it, expect, beforeEach } from 'vitest'
import './dictate-button'

describe('dictate-button smoke test', () => {
  beforeEach(() => {
    // Clear the body before each test
    document.body.innerHTML = ''
  })

  it('should register the custom element', () => {
    expect(customElements.get('dictate-button')).toBeDefined()
  })

  it('should render without crashing', () => {
    const element = document.createElement('dictate-button')
    document.body.appendChild(element)

    expect(element).toBeInstanceOf(HTMLElement)
    expect(element.tagName.toLowerCase()).toBe('dictate-button')
  })

  it('should have shadow DOM', () => {
    const element = document.createElement('dictate-button')
    document.body.appendChild(element)

    // Wait a tick for Solid to render
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(element.shadowRoot).toBeDefined()
        expect(element.shadowRoot).not.toBeNull()
        resolve(undefined)
      }, 100)
    })
  })

  it('should render a button in shadow DOM', () => {
    const element = document.createElement('dictate-button')
    document.body.appendChild(element)

    return new Promise((resolve) => {
      setTimeout(() => {
        const button = element.shadowRoot?.querySelector('button')
        expect(button).toBeDefined()
        expect(button).not.toBeNull()
        resolve(undefined)
      }, 100)
    })
  })

  it('should accept size attribute', () => {
    const element = document.createElement('dictate-button') as any
    element.size = 50
    document.body.appendChild(element)

    expect(element.size).toBe(50)
  })

  it('should accept apiEndpoint attribute', () => {
    const element = document.createElement('dictate-button') as any
    element.apiEndpoint = 'wss://custom-api.example.com/transcribe'
    document.body.appendChild(element)

    expect(element.apiEndpoint).toBe(
      'wss://custom-api.example.com/transcribe'
    )
  })

  it('should accept language attribute', () => {
    const element = document.createElement('dictate-button') as any
    element.language = 'en-US'
    document.body.appendChild(element)

    expect(element.language).toBe('en-US')
  })
})
