import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize theme from localStorage before React renders
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// Detect when Material Symbols font is loaded
if ('fonts' in document) {
  // Wait for all fonts to be ready
  document.fonts.ready.then(() => {
    // Check if Material Symbols font is actually loaded
    if (document.fonts.check('1em Material Symbols Outlined')) {
      document.documentElement.classList.add('material-symbols-loaded');
    } else {
      // Fallback: mark as loaded after a short delay
      setTimeout(() => {
        document.documentElement.classList.add('material-symbols-loaded');
      }, 100);
    }
  });
  
  // Also try to load the font explicitly with polling
  const checkFont = () => {
    if (document.fonts.check('1em Material Symbols Outlined')) {
      document.documentElement.classList.add('material-symbols-loaded');
    } else {
      setTimeout(checkFont, 50);
    }
  };
  // Start checking after a brief delay to allow font to start loading
  setTimeout(checkFont, 50);
} else {
  // Fallback for browsers without Font Loading API
  setTimeout(() => {
    document.documentElement.classList.add('material-symbols-loaded');
  }, 300);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

