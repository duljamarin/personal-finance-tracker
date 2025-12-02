import { useState, useEffect } from 'react'

export default function useDarkMode(storageKey = 'expense_dark_mode') {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, dark ? '1' : '0')
      if (dark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    } catch {}
  }, [dark, storageKey])

  return [dark, setDark]
}
