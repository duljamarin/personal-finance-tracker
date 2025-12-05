import React, { useState } from 'react'
import TransactionForm from './TransactionForm'

export default function NewTransaction({ onAdd }){
	const [open, setOpen] = useState(false)

	return (
		<div className="mb-6">
			{open ? (
				<div className="space-y-3">
					<TransactionForm
						onCancel={()=>setOpen(false)}
						onSubmit={(data)=>{ onAdd(data); setOpen(false) }}
					/>
				</div>
			) : (
				<div className="flex justify-center">
					<button
						className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-700"
						onClick={()=>setOpen(true)}
					>
						+ New Entry
					</button>
				</div>
			)}
		</div>
	)
}