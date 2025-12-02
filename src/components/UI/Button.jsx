import React from 'react'

export default function Button({ children, className = '', ...props }) {
  return (
    <button className={`px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 ${className}`} {...props}>
      {children}
    </button>
  )
}
