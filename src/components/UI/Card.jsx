import React from 'react'

export default function Card({ children, className='' }){
  return (
    <div className="bg-white dark:bg-gray-700 rounded-2xl shadow p-4">
      {children}
    </div>
  )
}
