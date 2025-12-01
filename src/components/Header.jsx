import React, { useState, useEffect } from 'react'

export default function Header() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check if dark mode was saved in localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setIsDark(savedDarkMode)
    // Apply to HTML element
    if (savedDarkMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDark = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    
    // Toggle the 'dark' class on <html>
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Save preference
    localStorage.setItem('darkMode', newDarkMode)
  }

  return (
    <header className="mb-6 flex items-center justify-between">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
        💰 Expense Tracker
      </h1>
      <button
        onClick={toggleDark}
        className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        {isDark ? '☀️ Light' : '🌙 Dark'}
      </button>
    </header>
  )
}