import React, { useState } from 'react'
import ExpenseForm from '../NewExpense/ExpenseForm'
import Button from '../UI/Button'

export default function ExpenseItem({ item, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)

  function handleSave(updated) {
    onUpdate(item.id, updated)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border">
      <div className="flex-1">
        {editing ? (
          <ExpenseForm
            initial={item}
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div>
            <div className="flex items-baseline gap-3">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-300">{item.date}</p>
            </div>
            <p className="text-indigo-600 dark:text-indigo-300 font-medium mt-1">${Number(item.amount).toFixed(2)}</p>
          </div>
        )}
      </div>
      <div className="ml-4 flex flex-col gap-2">
        {editing ? null : (
          <>
            <Button className="bg-yellow-500 hover:bg-yellow-600" onClick={() => setEditing(true)}>Edit</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => onDelete(item.id)}>Delete</Button>
          </>
        )}
      </div>
    </div>
  )
}
