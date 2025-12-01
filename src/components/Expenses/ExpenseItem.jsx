import React, { useState } from 'react'

export default function ExpenseItem({ item, onDelete, onUpdate }){
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: item.title, amount: item.amount, date: item.date })

  function save(){
    if(!form.title || !form.amount || !form.date) return
    onUpdate(item.id, { title: form.title.trim(), amount: Number(form.amount), date: form.date })
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border">
      <div className="flex-1">
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className="p-2 border rounded bg-white dark:bg-gray-700" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} />
            <input className="p-2 border rounded bg-white dark:bg-gray-700" type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} />
            <input className="p-2 border rounded bg-white dark:bg-gray-700" type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} />
          </div>
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
        {editing ? (
          <>
            <button onClick={save} className="px-3 py-1 rounded-xl bg-green-600 text-white">Save</button>
            <button onClick={()=>{ setEditing(false); setForm({ title: item.title, amount: item.amount, date: item.date }) }} className="px-3 py-1 rounded-xl border">Cancel</button>
          </>
        ) : (
          <>
            <button onClick={()=>setEditing(true)} className="px-3 py-1 rounded-xl bg-yellow-500 text-white">Edit</button>
            <button onClick={()=>onDelete(item.id)} className="px-3 py-1 rounded-xl bg-red-600 text-white">Delete</button>
          </>
        )}
      </div>
    </div>
  )
}
