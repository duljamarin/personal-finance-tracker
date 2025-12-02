import React from 'react'
import ThemeToggle from './ThemeToggle'

export default function Header({ isDark, toggleDark }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
        💰 Expense Tracker
      </h1>
      <ThemeToggle isDark={isDark} toggle={toggleDark} />
    </header>
  )
}