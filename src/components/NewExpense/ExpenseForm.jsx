import React, { useState } from 'react'

export default function ExpenseForm({ onSubmit, onCancel, initial }){
  const [title, setTitle] = useState(initial?.title || '')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [date, setDate] = useState(initial?.date || '')

  function submit(e){
    e.preventDefault()
    if(!title || !amount || !date) return
    onSubmit({ title: title.trim(), amount: Number(amount), date })
  }

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          className="col-span-1 sm:col-span-2 p-2 border rounded bg-white dark:bg-gray-700"
          placeholder="Title"
          value={title}
          onChange={e=>setTitle(e.target.value)}
        />
        <input
          className="p-2 border rounded bg-white dark:bg-gray-700"
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={e=>setAmount(e.target.value)}
          min="0"
          step="0.01"
        />
      </div>
      <div className="flex gap-3 items-center">
        <input
          className="p-2 border rounded flex-1 bg-white dark:bg-gray-700"
          type="date"
          value={date}
          onChange={e=>setDate(e.target.value)}
        />
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-xl border"
        >Cancel</button>
        <button className="px-4 py-2 rounded-xl bg-green-600 text-white">Save</button>
      </div>
    </form>
  )
}
