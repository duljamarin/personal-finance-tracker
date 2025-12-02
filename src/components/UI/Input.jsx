import React from 'react'

export default function Input({ className = '', ...props }) {
  return (
    <input className={`p-2 border rounded bg-white dark:bg-gray-700 ${className}`} {...props} />
  )
}
