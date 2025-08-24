/**
 * Navigation System Frontend
 * Handles theme switching and dynamic card sizing
 */
(function() {
  'use strict'

  // Theme management
  const root = document.documentElement
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const initial = saved || (prefersDark ? 'dark' : 'light')
  root.setAttribute('data-theme', initial)

  // Theme toggle functionality
  const btn = document.getElementById('themeToggle')
  if (btn) {
    btn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || 'light'
      const next = current === 'light' ? 'dark' : 'light'
      root.setAttribute('data-theme', next)
      localStorage.setItem('theme', next)
    })
  }

  /**
   * Dynamic card sizing functionality
   * Ensures all navigation cards have uniform height
   */
  function adjustCardSizes() {
    const navCards = document.querySelectorAll('.nav-card')
    if (navCards.length === 0) return

    // Reset all card heights to allow natural content expansion
    navCards.forEach(card => {
      card.style.height = 'auto'
      card.style.minHeight = 'auto'
    })

    // Wait for DOM update then calculate maximum height
    setTimeout(() => {
      let maxHeight = 0
      
      // Calculate actual height of all cards and find maximum
      navCards.forEach(card => {
        const rect = card.getBoundingClientRect()
        maxHeight = Math.max(maxHeight, rect.height)
      })

      // Apply maximum height to all cards
      if (maxHeight > 0) {
        navCards.forEach(card => {
          card.style.height = maxHeight + 'px'
          card.style.minHeight = maxHeight + 'px'
        })
      }
    }, 10)
  }

  // Event listeners for card size adjustment
  document.addEventListener('DOMContentLoaded', adjustCardSizes)
  window.addEventListener('resize', adjustCardSizes)
  
  // Monitor dynamic content changes (e.g., new cards added)
  const observer = new MutationObserver((mutations) => {
    let shouldAdjust = false
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && (node.classList.contains('nav-card') || node.querySelector('.nav-card'))) {
            shouldAdjust = true
          }
        })
      }
    })
    if (shouldAdjust) {
      setTimeout(adjustCardSizes, 100)
    }
  })

  // Start observing navigation grid changes
  document.addEventListener('DOMContentLoaded', () => {
    const navGrid = document.querySelector('.nav-grid')
    if (navGrid) {
      observer.observe(navGrid, { childList: true, subtree: true })
    }
  })
})();