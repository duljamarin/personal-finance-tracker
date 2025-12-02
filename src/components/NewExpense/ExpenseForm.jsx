import React, { useState } from 'react'
import Input from '../UI/Input'
import Button from '../UI/Button'

export default function ExpenseForm({ onSubmit, onCancel, initial }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [date, setDate] = useState(initial?.date || '')

  function submit(e) {
    e.preventDefault()
    if (!title || !amount || !date) return
    onSubmit({ title: title.trim(), amount: Number(amount), date })
  }

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          className="col-span-1 sm:col-span-2"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          min="0"
          step="0.01"
        />
      </div>
      <div className="flex gap-3 items-center">
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="flex-1"
        />
        <Button type="button" className="border bg-white text-gray-800 dark:bg-gray-700 dark:text-white" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700">Save</Button>
      </div>
    </form>
  )
}
