import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '../UI/Input'
import Button from '../UI/Button'
import { fetchCategories } from '../../utils/api'
import { translateCategoryName } from '../../utils/categoryTranslation'

export default function TransactionForm({ onSubmit, onCancel, initial }) {
	const { t, i18n } = useTranslation();
	// Get today's date in YYYY-MM-DD format
	const getTodayDate = () => new Date().toISOString().split('T')[0];
	
	const [title, setTitle] = useState(initial?.title || '')
	const [amount, setAmount] = useState(initial?.amount ?? '')
	// Default to today's date for quick entry
	const [date, setDate] = useState(initial?.date || getTodayDate())
	// Remember last used category and type for faster repeated entries
	const [categoryId, setCategoryId] = useState(
		initial?.categoryId || initial?.category?.id || ''
	)
	const [type, setType] = useState(initial?.type || localStorage.getItem('lastUsedType') || 'expense')
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

	// Re-render when language changes to update translated validation messages
	useEffect(() => {
		// This effect will run whenever language changes
	}, [i18n.language]);

	function validate() {
		const newErrors = {}
		if (!title.trim()) newErrors.title = 'transactions.titleError';
		if (!amount || isNaN(amount) || Number(amount) <= 0) newErrors.amount = 'transactions.amountError';
		if (!date) newErrors.date = 'transactions.dateError';
		if (!categoryId || categoryId === '') newErrors.categoryId = 'transactions.categoryError';
		if (!type) newErrors.type = 'transactions.typeError';
		// tags are optional
		return newErrors
	}

	function handleTitleChange(e) {
		const value = e.target.value
		setTitle(value)
		setErrors(prev => {
			const newErrors = { ...prev }
			if (value.trim()) delete newErrors.title
			else newErrors.title = 'transactions.titleError';
			return newErrors
		})
	}

	function handleAmountChange(e) {
		const value = e.target.value
		setAmount(value)
		setErrors(prev => {
			const newErrors = { ...prev }
			if (value && !isNaN(value) && Number(value) > 0) delete newErrors.amount
			else newErrors.amount = 'transactions.amountError';
			return newErrors
		})
	}

	function handleDateChange(e) {
		const value = e.target.value
		setDate(value)
		setErrors(prev => {
			const newErrors = { ...prev }
			if (value) delete newErrors.date
			else newErrors.date = 'transactions.dateError';
			return newErrors
		})
	}

	function handleCategoryChange(e) {
		const value = e.target.value
		setCategoryId(value)
		setErrors(prev => {
			const newErrors = { ...prev }
			if (value && value !== '') delete newErrors.categoryId
			else newErrors.categoryId = 'transactions.categoryError';
			return newErrors
		})
	}

	function submit(e) {
		e.preventDefault()
		const newErrors = validate()
		setErrors(newErrors)
		if (Object.keys(newErrors).length > 0) return
		const tagsList = tags.split(',').map(t => t.trim()).filter(Boolean)
		
		// Remember last used category and type for next time
		if (!initial?.id) { // Only save defaults when adding new transactions
			localStorage.setItem('lastUsedCategory', categoryId)
			localStorage.setItem('lastUsedType', type)
		}
		
		onSubmit({ title: title.trim(), amount: Number(amount), date, categoryId, type, tags: tagsList })
	}

	return (
		<form onSubmit={submit} className="flex flex-col gap-4 sm:gap-6">
			<h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">
				{initial?.id ? t('transactions.editTransaction') : t('transactions.addNew')}
			</h2>
			<div className="flex flex-col gap-4 sm:gap-6">
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{t('transactions.titleLabel')}</label>
					<Input
						placeholder={t('transactions.titlePlaceholder')}
						value={title}
						onChange={handleTitleChange}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition ${errors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
					/>
					{errors.title && (
						<span className="block text-xs text-red-600 dark:text-red-400 font-medium">
							{t(errors.title)}
						</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{t('transactions.type')}</label>
					<select
						value={type}
						onChange={e => setType(e.target.value)}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition cursor-pointer ${errors.type ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
					>
						<option value="expense">💸 {t('transactions.expense')}</option>
						<option value="income">💰 {t('transactions.income')}</option>
					</select>
					{errors.type && (
						<span className="block text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.type)}</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{t('transactions.amountLabel')}</label>
					<Input
						type="number"
						placeholder={t('transactions.amountPlaceholder')}
						value={amount}
						onChange={handleAmountChange}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition ${errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
					/>
					{errors.amount && (
						<span className="block text-xs text-red-600 dark:text-red-400 font-medium">
							{t(errors.amount)}
						</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{t('transactions.categoryLabel')}</label>
					<select
						value={categoryId}
						onChange={handleCategoryChange}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition cursor-pointer ${errors.categoryId ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
					>
						<option value="">{t('transactions.selectCategory')}</option>
						{categories.map(cat => (
							<option key={cat.id} value={cat.id}>{translateCategoryName(cat.name)}</option>
						))}
					</select>
					{errors.categoryId && (
						<span className="block text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.categoryId)}</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{t('transactions.tagsLabel')} <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">{t('transactions.tagsOptional')}</span></label>
					<Input
						placeholder={t('transactions.tagsPlaceholder')}
						value={tags}
						onChange={e => setTags(e.target.value)}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition ${errors.tags ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">{t('transactions.dateLabel')}</label>
					<Input
						type="date"
						value={date}
						onChange={handleDateChange}
						className={`border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition [color-scheme:light] dark:[color-scheme:dark] ${errors.date ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
						placeholder="mm/dd/yyyy"
					/>
					{errors.date && (
						<span className="block text-xs text-red-600 dark:text-red-400 font-medium">
							{t(errors.date)}
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
					{t('forms.cancel')}
				</Button>
				<Button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 sm:py-3 rounded-xl shadow-lg transition-all text-sm sm:text-base">{t('transactions.saveTransaction')}</Button>
			</div>
		</form>
	)
}