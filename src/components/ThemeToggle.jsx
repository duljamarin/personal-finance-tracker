import React from 'react'

export default function ThemeToggle({ isDark, toggle }) {
  return (
    <button
      onClick={toggle}
      className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
    >
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </button>
  )
}
