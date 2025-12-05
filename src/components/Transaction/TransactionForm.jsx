import React, { useEffect, useState } from 'react'
import Input from '../UI/Input'
import Button from '../UI/Button'
import { fetchCategories } from '../../utils/api'

export default function TransactionForm({ onSubmit, onCancel, initial }) {
	const [title, setTitle] = useState(initial?.title || '')
	const [amount, setAmount] = useState(initial?.amount ?? '')
	const [date, setDate] = useState(initial?.date || '')
	const [categoryId, setCategoryId] = useState(initial?.categoryId || '')
	const [type, setType] = useState(initial?.type || 'expense')
	const [tags, setTags] = useState(Array.isArray(initial?.tags) ? initial.tags.join(', ') : '')
	const [categories, setCategories] = useState([])
	const [errors, setErrors] = useState({})

	useEffect(() => {
		fetchCategories().then(setCategories).catch(() => setCategories([]))
	}, [])

	function validate() {
		const newErrors = {}
		if (!title.trim()) newErrors.title = 'Title is required.'
		if (!amount || isNaN(amount) || Number(amount) <= 0) newErrors.amount = 'Amount must be a positive number.'
		if (!date) newErrors.date = 'Date is required.'
		if (!categoryId) newErrors.categoryId = 'Category is required.'
		if (!type) newErrors.type = 'Type is required.'
		// tags are optional
		return newErrors
	}

	function handleTitleChange(e) {
		const value = e.target.value
		setTitle(value)
		setErrors(prev => {
			const newErrors = { ...prev }
			if (value.trim()) delete newErrors.title
			else newErrors.title = 'Title is required.'
			return newErrors
		})
	}

	function handleAmountChange(e) {
		const value = e.target.value
		setAmount(value)
		setErrors(prev => {
			const newErrors = { ...prev }
			if (value && !isNaN(value) && Number(value) > 0) delete newErrors.amount
			else newErrors.amount = 'Amount must be a positive number.'
			return newErrors
		})
	}

	function handleDateChange(e) {
		const value = e.target.value
		setDate(value)
		setErrors(prev => {
			const newErrors = { ...prev }
			if (value) delete newErrors.date
			else newErrors.date = 'Date is required.'
			return newErrors
		})
	}

	function submit(e) {
		e.preventDefault()
		const newErrors = validate()
		setErrors(newErrors)
		if (Object.keys(newErrors).length > 0) return
		const tagsList = tags.split(',').map(t => t.trim()).filter(Boolean)
		onSubmit({ title: title.trim(), amount: Number(amount), date, categoryId, type, tags: tagsList })
	}

	return (
		<form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow space-y-6">
			<div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
				<div className="col-span-1 sm:col-span-2 flex flex-col gap-2">
					<Input
						placeholder="Title"
						value={title}
						onChange={handleTitleChange}
						className={errors.title ? 'border-2 border-red-500' : ''}
					/>
					{errors.title && (
						<span className="block mt-1 text-xs text-red-600">
							{errors.title}
						</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex flex-col gap-2">
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
						<select
							value={type}
							onChange={e => setType(e.target.value)}
							className={`border p-2 rounded ${errors.type ? 'border-red-500' : 'border-gray-300'}`}
						>
							<option value="expense">Expense</option>
							<option value="income">Income</option>
						</select>
						{errors.type && (
							<span className="block mt-1 text-xs text-red-600">{errors.type}</span>
						)}
					</div>
					<Input
						type="number"
						placeholder="Amount"
						value={amount}
						onChange={handleAmountChange}
						min="0"
						step="0.01"
						className={errors.amount ? 'border-2 border-red-500' : ''}
					/>
					{errors.amount && (
						<span className="block mt-1 text-xs text-red-600">
							{errors.amount}
						</span>
					)}
				</div>
			</div>
			<div className="flex flex-col gap-2 mt-2">
				<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
				<select
					value={categoryId}
					onChange={e => setCategoryId(e.target.value)}
					className={`border p-2 rounded ${errors.categoryId ? 'border-red-500' : 'border-gray-300'}`}
				>
					<option value="">Select category</option>
					{categories.map(cat => (
						<option key={cat.id} value={cat.id}>{cat.name}</option>
					))}
				</select>
				{errors.categoryId && (
					<span className="block mt-1 text-xs text-red-600">{errors.categoryId}</span>
				)}
			</div>
			<div className="flex flex-col gap-2 mt-2">
				<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma separated)</label>
				<Input
					placeholder="e.g. groceries, food, work"
					value={tags}
					onChange={e => setTags(e.target.value)}
				/>
			</div>
			<div className="flex gap-4 items-end mt-2">
				<div className="flex-1 flex flex-col gap-2">
					<Input
						type="date"
						value={date}
						onChange={handleDateChange}
						className={errors.date ? 'border-2 border-red-500' : ''}
						placeholder="mm/dd/yyyy"
					/>
					{errors.date && (
						<span className="block mt-1 text-xs text-red-600">
							{errors.date}
						</span>
					)}
				</div>
				<Button
					type="button"
					className="border border-gray-300 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-white dark:border-gray-600"
					onClick={onCancel}
				>
					Cancel
				</Button>
				<Button type="submit" className="bg-green-600 hover:bg-green-700">Save</Button>
			</div>
		</form>
	)
}