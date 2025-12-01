import React from 'react'
import ExpenseItem from './ExpenseItem'

export default function ExpensesList({ items, onDelete, onUpdate }){
  return (
    <div className="space-y-3">
      {items.map(item => (
        <ExpenseItem key={item.id} item={item} onDelete={onDelete} onUpdate={onUpdate} />
      ))}
    </div>
  )
}
