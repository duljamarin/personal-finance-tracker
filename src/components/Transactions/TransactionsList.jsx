import React from 'react'
import TransactionItem from './TransactionItem.jsx' 
export default function TransactionsList({ items, onDelete, onUpdate }) {
  // ...existing code from ExpensesList.jsx, will be migrated
    return (
      <div className="space-y-3">
        {items.map(item => (
          <TransactionItem key={item.id} item={item} onDelete={onDelete} onUpdate={onUpdate} />
        ))}
      </div>
    )
}
