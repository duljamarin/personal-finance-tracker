import { useEffect, useState } from 'react'
import Input from '../UI/Input'
import Button from '../UI/Button'
import { fetchCategories } from '../../utils/api'

export default function TransactionForm({ onSubmit, onCancel, initial }) {
	const [title, setTitle] = useState(initial?.title || '')
	const [amount, setAmount] = useState(initial?.amount ?? '')
	const [date, setDate] = useState(initial?.date || '')
	const [categoryId, setCategoryId] = useState(
		initial?.categoryId || initial?.category?.id || ''
	)
	const [type, setType] = useState(initial?.type || 'expense')
	const [tags, setTags] = useState(Array.isArray(initial?.tags) ? initial.tags.join(', ') : '')
	const [categories, setCategories] = useState([])
	const [errors, setErrors] = useState({})

	useEffect(() => {
		fetchCategories().then(cats => {
			setCategories(cats);
			// If editing, set categoryId from initial.category.id if present and not already set
			if (initial?.category?.id && !categoryId) {
				setCategoryId(initial.category.id);
			}
		}).catch(() => setCategories([]));
		// eslint-disable-next-line
	}, []);

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
		<form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col gap-4 sm:gap-6">
			<h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">
				{initial?.id ? 'Edit Transaction' : 'Add Transaction'}
			</h2>
			<div className="flex flex-col gap-4 sm:gap-6">
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Title</label>
					<Input
						placeholder="e.g. Grocery shopping, Salary payment"
						value={title}
						onChange={handleTitleChange}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition ${errors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
					/>
					{errors.title && (
						<span className="block text-xs text-red-600 dark:text-red-400 font-medium">
							{errors.title}
						</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Type</label>
					<select
						value={type}
						onChange={e => setType(e.target.value)}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition cursor-pointer ${errors.type ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
					>
						<option value="expense">💸 Expense</option>
						<option value="income">💰 Income</option>
					</select>
					{errors.type && (
						<span className="block text-xs text-red-600 dark:text-red-400 font-medium">{errors.type}</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</label>
					<Input
						type="number"
						placeholder="0.00"
						value={amount}
						onChange={handleAmountChange}
						min="0"
						step="0.01"
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition ${errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
					/>
					{errors.amount && (
						<span className="block text-xs text-red-600 dark:text-red-400 font-medium">
							{errors.amount}
						</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
					<select
						value={categoryId}
						onChange={e => {
							const value = e.target.value;
							setCategoryId(value);
							setErrors(prev => {
								const newErrors = { ...prev };
								if (value) delete newErrors.categoryId;
								else newErrors.categoryId = 'Category is required.';
								return newErrors;
							});
						}}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition cursor-pointer ${errors.categoryId ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
					>
						<option value="">Select category</option>
						{categories.map(cat => (
							<option key={cat.id} value={cat.id}>{cat.name}</option>
						))}
					</select>
					{errors.categoryId && (
						<span className="block text-xs text-red-600 dark:text-red-400 font-medium">{errors.categoryId}</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Tags <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(optional)</span></label>
					<Input
						placeholder="e.g. groceries, food, work"
						value={tags}
						onChange={e => setTags(e.target.value)}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition ${errors.tags ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Date</label>
					<Input
						type="date"
						value={date}
						onChange={handleDateChange}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition [color-scheme:light] dark:[color-scheme:dark] ${errors.date ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
						placeholder="mm/dd/yyyy"
					/>
					{errors.date && (
						<span className="block text-xs text-red-600 dark:text-red-400 font-medium">
							{errors.date}
						</span>
					)}
				</div>
			</div>
			<div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 flex-col sm:flex-row">
				<Button
					type="button"
					className="flex-1 border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold py-2 sm:py-3 rounded-xl transition-all text-sm sm:text-base"
					onClick={onCancel}
				>
					Cancel
				</Button>
				<Button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 sm:py-3 rounded-xl shadow-lg transition-all text-sm sm:text-base">Save Transaction</Button>
			</div>
		</form>
	)
}