import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '../UI/Input'
import Button from '../UI/Button'
import { fetchCategories, addCategory } from '../../utils/api'
import { translateCategoryName } from '../../utils/categoryTranslation'
import { useToast } from '../../context/ToastContext'

const inputBaseClass = 'border p-2 sm:p-3 text-sm sm:text-base rounded-xl w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition'
const inputErrorClass = 'border-red-500 focus:ring-red-500'
const inputNormalClass = 'border-gray-300 dark:border-gray-600'

export default function TransactionForm({ onSubmit, onCancel, initial, onCategoryAdded }) {
	const { t, i18n } = useTranslation()
	const { addToast } = useToast()

	const [title, setTitle] = useState(initial?.title || '')
	const [amount, setAmount] = useState(initial?.amount ?? '')
	const [date, setDate] = useState(initial?.date || new Date().toISOString().split('T')[0])
	const [categoryId, setCategoryId] = useState(initial?.categoryId || initial?.category?.id || '')
	const [type, setType] = useState(initial?.type || localStorage.getItem('lastUsedType') || 'expense')
	const [tags, setTags] = useState(Array.isArray(initial?.tags) ? initial.tags.join(', ') : '')
	const [categories, setCategories] = useState([])
	const [errors, setErrors] = useState({})
	const [showProposalInput, setShowProposalInput] = useState(false)
	const [proposedCategoryName, setProposedCategoryName] = useState('')
	const [categoryProposalSuccess, setCategoryProposalSuccess] = useState(false)
	const [currencyCode, setCurrencyCode] = useState(initial?.currency_code || initial?.currencyCode || 'EUR')
	const [exchangeRate, setExchangeRate] = useState(initial?.exchange_rate || initial?.exchangeRate || 1.0)

	useEffect(() => {
		fetchCategories().then(cats => {
			setCategories(cats)
			if (initial?.category?.id && !categoryId) {
				setCategoryId(initial.category.id)
			}
		}).catch(() => setCategories([]))
	}, [])

	useEffect(() => {
		// Trigger re-render when language changes
	}, [i18n.language])

	function validate() {
		const newErrors = {}
		if (!title.trim()) newErrors.title = 'transactions.titleError'
		if (!amount || isNaN(amount) || Number(amount) <= 0) newErrors.amount = 'transactions.amountError'
		if (!date) newErrors.date = 'transactions.dateError'
		if (!categoryId || categoryId === '' || categoryId === 'other') newErrors.categoryId = 'transactions.categoryError'
		if (!type) newErrors.type = 'transactions.typeError'
		return newErrors
	}

	function handleTitleChange(e) {
		const value = e.target.value
		setTitle(value)
		setErrors(prev => ({
			...prev,
			title: value.trim() ? undefined : 'transactions.titleError'
		}))
	}

	function handleAmountChange(e) {
		const value = e.target.value
		setAmount(value)
		setErrors(prev => ({
			...prev,
			amount: value && !isNaN(value) && Number(value) > 0 ? undefined : 'transactions.amountError'
		}))
	}

	function handleDateChange(e) {
		const value = e.target.value
		setDate(value)
		setErrors(prev => ({
			...prev,
			date: value ? undefined : 'transactions.dateError'
		}))
	}

	function handleCategoryChange(e) {
		const value = e.target.value
		setCategoryId(value)
		if (value === 'other') {
			setShowProposalInput(true)
			setCategoryProposalSuccess(false)
		} else {
			setShowProposalInput(false)
			setProposedCategoryName('')
			setCategoryProposalSuccess(false)
		}
		setErrors(prev => ({
			...prev,
			categoryId: value && value !== 'other' ? undefined : prev.categoryId
		}))
	}

	async function handleSubmitProposal() {
		if (!proposedCategoryName.trim()) {
			addToast(t('categoryProposal.error'), 'error')
			return
		}

		try {
			const newCategory = await addCategory({ name: proposedCategoryName.trim() })
			addToast(t('categoryProposal.submitted'), 'success')
			setCategoryProposalSuccess(true)

			const cats = await fetchCategories()
			setCategories(cats)
			setCategoryId(newCategory.id)
			setProposedCategoryName('')

			if (onCategoryAdded) onCategoryAdded()
		} catch (e) {
			console.error('Failed to add category:', e)
			const errorMsg = e.message.includes('already exists') ? 'categories.exists' : 'categoryProposal.error'
			addToast(t(errorMsg), 'error')
		}
	}

	function submit(e) {
		e.preventDefault()
		const newErrors = validate()
		setErrors(newErrors)

		if (Object.keys(newErrors).length > 0) return

		const tagsList = tags.split(',').map(tag => tag.trim()).filter(Boolean)

		if (!initial?.id) {
			localStorage.setItem('lastUsedCategory', categoryId)
			localStorage.setItem('lastUsedType', type)
		}

		onSubmit({
			title: title.trim(),
			amount: Number(amount),
			date,
			categoryId,
			type,
			tags: tagsList,
			currencyCode,
			exchangeRate: Number(exchangeRate)
		})
	}

	const getInputClassName = (fieldError) =>
		`${inputBaseClass} ${fieldError ? inputErrorClass : inputNormalClass}`

	return (
		<form onSubmit={submit} className="flex flex-col gap-4 sm:gap-6 max-w-2xl mx-auto h-full">
			<h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2 flex-shrink-0">
				{initial?.id ? t('transactions.editTransaction') : t('transactions.addNew')}
			</h2>

			<div className="flex flex-col gap-4 sm:gap-6 overflow-y-auto flex-1 pr-2 sm:pr-3">
				{/* Title */}
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
						{t('transactions.titleLabel')}
					</label>
					<Input
						placeholder={t('transactions.titlePlaceholder')}
						value={title}
						onChange={handleTitleChange}
						className={getInputClassName(errors.title)}
					/>
					{errors.title && (
						<span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.title)}</span>
					)}
				</div>

				{/* Type & Amount */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
					<div className="flex flex-col gap-2">
						<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
							{t('transactions.type')}
						</label>
						<select
							value={type}
							onChange={e => setType(e.target.value)}
							className={getInputClassName(errors.type)}
						>
							<option value="expense">💸 {t('transactions.expense')}</option>
							<option value="income">💰 {t('transactions.income')}</option>
						</select>
						{errors.type && (
							<span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.type)}</span>
						)}
					</div>
					<div className="flex flex-col gap-2">
						<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
							{t('transactions.amountLabel')}
						</label>
						<Input
							type="number"
							placeholder={t('transactions.amountPlaceholder')}
							value={amount}
							onChange={handleAmountChange}
							className={getInputClassName(errors.amount)}
						/>
						{errors.amount && (
							<span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.amount)}</span>
						)}
					</div>
				</div>

				{/* Currency Fields */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
							{t('currency.code')}
						</label>
						<select
							value={currencyCode}
							onChange={e => setCurrencyCode(e.target.value)}
							className={inputBaseClass + ' ' + inputNormalClass}
						>
							<option value="USD">🇺🇸 {t('currency.USD')}</option>
							<option value="EUR">🇪🇺 {t('currency.EUR')}</option>
							<option value="GBP">🇬🇧 {t('currency.GBP')}</option>
							<option value="ALL">🇦🇱 {t('currency.ALL')}</option>
							<option value="CHF">🇨🇭 {t('currency.CHF')}</option>
							<option value="JPY">🇯🇵 {t('currency.JPY')}</option>
							<option value="CAD">🇨🇦 {t('currency.CAD')}</option>
							<option value="AUD">🇦🇺 {t('currency.AUD')}</option>
						</select>
					</div>
					<div className="flex flex-col gap-2">
						<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
							{t('currency.exchangeRate')}
							<span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">
								{t('currency.exchangeRateOptional')}
							</span>
						</label>
						<Input
							type="number"
							step="0.000001"
							placeholder="1.0"
							value={exchangeRate}
							onChange={e => setExchangeRate(e.target.value)}
							className={inputBaseClass + ' ' + inputNormalClass}
						/>
						<p className="text-xs text-gray-500 dark:text-gray-400">
							{t('currency.baseAmount')}: €{(Number(amount || 0) * Number(exchangeRate || 1)).toFixed(2)}
						</p>
					</div>
				</div>

				{/* Category */}
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
						{t('transactions.categoryLabel')}
					</label>
					<select
						value={categoryId}
						onChange={handleCategoryChange}
						className={getInputClassName(errors.categoryId)}
					>
						<option value="">{t('transactions.selectCategory')}</option>
						{categories.map(cat => (
							<option key={cat.id} value={cat.id}>{translateCategoryName(cat.name)}</option>
						))}
						<option value="other">➕ {t('categoryProposal.other')}</option>
					</select>
					{errors.categoryId && (
						<span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.categoryId)}</span>
					)}

					{showProposalInput && (
						<div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
							<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
								{t('categoryProposal.proposedName')}
							</label>
							<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
								<Input
									placeholder={t('categoryProposal.proposedNamePlaceholder')}
									value={proposedCategoryName}
									onChange={e => setProposedCategoryName(e.target.value)}
									className="flex-1 border p-2 text-sm rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 min-w-0"
								/>
								<Button
									type="button"
									onClick={handleSubmitProposal}
									className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm whitespace-nowrap w-full sm:w-auto"
								>
									{t('categoryProposal.submit')}
								</Button>
							</div>
							{categoryProposalSuccess && (
								<p className="text-xs text-green-600 dark:text-green-400 mt-2">
									{t('categoryProposal.submittedDesc')}
								</p>
							)}
						</div>
					)}
				</div>

				{/* Tags */}
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
						{t('transactions.tagsLabel')}
						<span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">
							{t('transactions.tagsOptional')}
						</span>
					</label>
					<Input
						placeholder={t('transactions.tagsPlaceholder')}
						value={tags}
						onChange={e => setTags(e.target.value)}
						className={inputBaseClass + ' ' + inputNormalClass}
					/>
				</div>

				{/* Date */}
				<div className="flex flex-col gap-2">
					<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
						{t('transactions.dateLabel')}
					</label>
					<Input
						type="date"
						value={date}
						onChange={handleDateChange}
						className={getInputClassName(errors.date) + ' [color-scheme:light] dark:[color-scheme:dark]'}
						placeholder="mm/dd/yyyy"
					/>
					{errors.date && (
						<span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.date)}</span>
					)}
				</div>
			</div>

			{/* Buttons */}
			<div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 flex-col sm:flex-row flex-shrink-0 mt-auto">
				<Button
					type="button"
					className="flex-1 border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold py-2 sm:py-3 rounded-xl transition-all text-sm sm:text-base"
					onClick={onCancel}
				>
					{t('forms.cancel')}
				</Button>
				<Button
					type="submit"
					className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 sm:py-3 rounded-xl shadow-lg transition-all text-sm sm:text-base"
				>
					{t('transactions.saveTransaction')}
				</Button>
			</div>
		</form>
	)
}
