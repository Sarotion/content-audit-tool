/**
 * GetFound Content Audit – Shadow DOM widget entry point
 *
 * Usage on any page (WordPress, custom HTML, etc.):
 *   <div id="content-audit-widget"></div>
 *   <script src="https://frontend-five-gray-36.vercel.app/widget.js" defer></script>
 *
 * The app mounts into a Shadow DOM so WordPress (or any host) CSS cannot
 * interfere with Tailwind utility classes, and vice-versa.
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Import the full Tailwind-processed stylesheet as an inlined string.
// Vite handles the ?inline suffix: PostCSS + Tailwind run first, then the
// result is returned as a JS string (no separate .css file emitted).
import appStyles from './index.css?inline'

;(function () {
  // Signal to App that it is running in embedded/widget mode so it:
  //  – skips min-h-screen (avoids circular height issues)
  //  – renders the in-flow CTA bar instead of position:fixed
  window.__GF_EMBEDDED__ = true

  // Google Fonts must live in the real document <head>, not inside the
  // Shadow DOM, because @font-face declarations don't pierce shadow boundaries.
  if (!document.querySelector('link[data-gf-widget-fonts]')) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    link.setAttribute('data-gf-widget-fonts', '')
    document.head.appendChild(link)
  }

  function mount() {
    const container = document.getElementById('content-audit-widget')
    if (!container) {
      console.warn('[GetFound Widget] No element with id="content-audit-widget" found.')
      return
    }

    // Attach a closed shadow root so host-page CSS stays out completely.
    const shadow = container.attachShadow({ mode: 'open' })

    // ── Inject styles ──────────────────────────────────────────────────────
    // Remap :root { ... } → :host { ... } so Tailwind CSS custom properties
    // (--accent, --surface, etc.) are scoped to the shadow host element.
    const styleEl = document.createElement('style')
    styleEl.textContent = appStyles.replace(/:root(\s*\{)/g, ':host$1')
    shadow.appendChild(styleEl)

    // ── Mount React ────────────────────────────────────────────────────────
    const appRoot = document.createElement('div')
    shadow.appendChild(appRoot)
    createRoot(appRoot).render(React.createElement(App))
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount)
  } else {
    mount()
  }
})()
