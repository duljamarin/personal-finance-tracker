import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '../UI/Input'
import Button from '../UI/Button'
import { fetchCategories, addCategory, isFirstOccurrence } from '../../utils/api'
import { translateCategoryName } from '../../utils/categoryTranslation'
import { useToast } from '../../context/ToastContext'

const inputBaseClass = 'border py-2 px-2 sm:p-3 text-xs sm:text-base rounded-xl sm:w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition'
const inputErrorClass = 'border-red-500 focus:ring-red-500'
const inputNormalClass = 'border-gray-300 dark:border-gray-600'

export default function TransactionForm({ onSubmit, onCancel, initial, onCategoryAdded, allowRecurring = true }) {
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
	
	// If editing a transaction from a recurring rule, check if it's the first instance
	const [updateRecurringTemplate, setUpdateRecurringTemplate] = useState(false)
	const [isFirstRecurringInstance, setIsFirstRecurringInstance] = useState(false)
	const isFromRecurring = initial?.source_recurring_id
	
	// Recurring transaction state
	const [isRecurring, setIsRecurring] = useState(initial?.isRecurring || false)
	const [frequency, setFrequency] = useState(initial?.frequency || 'monthly')
	const [intervalCount, setIntervalCount] = useState(initial?.intervalCount || initial?.interval_count || 1)
	const [endType, setEndType] = useState(initial?.endDate || initial?.end_date ? 'date' : initial?.occurrencesLimit || initial?.occurrences_limit ? 'count' : 'never')
	const [endDate, setEndDate] = useState(initial?.endDate || initial?.end_date || '')
	const [occurrencesLimit, setOccurrencesLimit] = useState(initial?.occurrencesLimit || initial?.occurrences_limit || '')

	useEffect(() => {
		fetchCategories().then(cats => {
			setCategories(cats)
			if (initial?.category?.id && !categoryId) {
				setCategoryId(initial.category.id)
			}
		}).catch(() => setCategories([]))
		
		// Check if this is the first occurrence of a recurring transaction
		if (initial?.id && initial?.source_recurring_id) {
			isFirstOccurrence(initial.id, initial.source_recurring_id).then(result => {
				setIsFirstRecurringInstance(result)
				// If first instance, auto-enable template update
				if (result) {
					setUpdateRecurringTemplate(true)
				}
			}).catch(() => setIsFirstRecurringInstance(false))
		}
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
		
		// Recurring validation
		if (isRecurring) {
			if (!intervalCount || isNaN(intervalCount) || Number(intervalCount) < 1) {
				newErrors.intervalCount = 'recurring.intervalError'
			}
			if (endType === 'date' && !endDate) {
				newErrors.endDate = 'recurring.endDateError'
			}
			if (endType === 'count' && (!occurrencesLimit || isNaN(occurrencesLimit) || Number(occurrencesLimit) < 1)) {
				newErrors.occurrencesLimit = 'recurring.occurrencesError'
			}
		}
		
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

		const formData = {
			title: title.trim(),
			amount: Number(amount),
			date,
			categoryId,
			type,
			tags: tagsList,
			currencyCode,
			exchangeRate: Number(exchangeRate),
			updateRecurringTemplate: isFromRecurring && (isFirstRecurringInstance || updateRecurringTemplate),
			sourceRecurringId: initial?.source_recurring_id
		}
		
		// Add recurring data if enabled
		if (isRecurring && allowRecurring) {
			formData.isRecurring = true
			formData.frequency = frequency
			formData.intervalCount = Number(intervalCount)
			formData.startDate = date
			
			if (endType === 'date' && endDate) {
				formData.endDate = endDate
			} else if (endType === 'count' && occurrencesLimit) {
				formData.occurrencesLimit = Number(occurrencesLimit)
			}
		}

		onSubmit(formData)
	}

	const getInputClassName = (fieldError) =>
		`${inputBaseClass} ${fieldError ? inputErrorClass : inputNormalClass}`

	return (
		<form onSubmit={submit} className="flex flex-col gap-3 sm:gap-6 max-w-2xl mx-auto h-full">
			<h2 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white mb-1 sm:mb-2 flex-shrink-0">
				{initial?.id ? t('transactions.editTransaction') : t('transactions.addNew')}
			</h2>

			<div className="flex flex-col gap-3 sm:gap-6 overflow-y-auto flex-1 pr-2 sm:pr-3">
				{/* Show recurring badge if editing a transaction from recurring rule */}
				{isFromRecurring && (
					<div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-2 sm:p-4">
						<div className="flex items-center gap-2 mb-1 sm:mb-2">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							<span className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300">
								{t('recurring.generatedFromRule')}
							</span>
						</div>
						{isFirstRecurringInstance ? (
							<p className="text-xs text-purple-600 dark:text-purple-400 flex items-start gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span>{t('recurring.firstInstanceNote')}</span>
							</p>
						) : (
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={updateRecurringTemplate}
									onChange={e => setUpdateRecurringTemplate(e.target.checked)}
									className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
								/>
								<span className="text-xs text-gray-600 dark:text-gray-400">
									{t('recurring.alsoUpdateTemplate')}
								</span>
							</label>
						)}
					</div>
				)}
				
				{/* Title */}
				<div className="flex flex-col gap-1 sm:gap-2">
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
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
					<div className="flex flex-col gap-1 sm:gap-2">
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
					<div className="flex flex-col gap-1 sm:gap-2">
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
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
					<div className="flex flex-col gap-1 sm:gap-2">
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
					<div className="flex flex-col gap-1 sm:gap-2">
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
				<div className="flex flex-col gap-1 sm:gap-2">
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
						<div className="mt-2 sm:mt-3 p-2 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
							<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-2 block">
								{t('categoryProposal.proposedName')}
							</label>
							<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
								<Input
									placeholder={t('categoryProposal.proposedNamePlaceholder')}
									value={proposedCategoryName}
									onChange={e => setProposedCategoryName(e.target.value)}
									className="flex-1 border p-1.5 sm:p-2 text-xs sm:text-sm rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 min-w-0"
								/>
								<Button
									type="button"
									onClick={handleSubmitProposal}
									className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs sm:text-sm whitespace-nowrap w-full sm:w-auto"
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
				<div className="flex flex-col gap-1 sm:gap-2">
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

				{/* Recurring Transaction Toggle - only show for new transactions */}
				{allowRecurring && !initial?.id && !initial?.source_recurring_id && (
					<div className="flex flex-col gap-3 sm:gap-4 p-2 sm:p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								<label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
									{t('recurring.makeRecurring')}
								</label>
							</div>
							<button
								type="button"
								onClick={() => setIsRecurring(!isRecurring)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
									isRecurring ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										isRecurring ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>
						
						{isRecurring && (
							<div className="flex flex-col gap-3 sm:gap-4 pt-2 border-t border-purple-200 dark:border-purple-700">
								{/* Frequency & Interval */}
								<div className="grid grid-cols-2 gap-2 sm:gap-3">
									<div className="flex flex-col gap-1 sm:gap-2">
										<label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
											{t('recurring.frequency')}
										</label>
										<select
											value={frequency}
											onChange={e => setFrequency(e.target.value)}
											className={inputBaseClass + ' ' + inputNormalClass}
										>
											<option value="daily">{t('recurring.daily')}</option>
											<option value="weekly">{t('recurring.weekly')}</option>
											<option value="monthly">{t('recurring.monthly')}</option>
											<option value="yearly">{t('recurring.yearly')}</option>
										</select>
									</div>
									<div className="flex flex-col gap-1 sm:gap-2">
										<label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
											{t('recurring.every')}
										</label>
										<div className="flex items-center gap-1 sm:gap-2">
											<Input
												type="number"
												min="1"
												value={intervalCount}
												onChange={e => setIntervalCount(e.target.value)}
												className={`${getInputClassName(errors.intervalCount)} w-16 sm:w-20`}
											/>
											<span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
												{t(`recurring.${frequency}Unit`, { count: Number(intervalCount) || 1 })}
											</span>
										</div>
										{errors.intervalCount && (
											<span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.intervalCount)}</span>
										)}
									</div>
								</div>
								
								{/* End Condition */}
								<div className="flex flex-col gap-1 sm:gap-2">
									<label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
										{t('recurring.ends')}
									</label>
									<div className="flex flex-wrap gap-1.5 sm:gap-2">
										{['never', 'date', 'count'].map(option => (
											<button
												key={option}
												type="button"
												onClick={() => setEndType(option)}
												className={`px-2 py-1.5 sm:px-3 sm:py-2 text-xs rounded-lg font-medium border transition-all ${
													endType === option
														? 'bg-purple-600 text-white border-purple-700'
														: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400'
												}`}
											>
												{t(`recurring.end${option.charAt(0).toUpperCase() + option.slice(1)}`)}
											</button>
										))}
									</div>
								</div>
								
								{/* End Date Input */}
								{endType === 'date' && (
									<div className="flex flex-col gap-1 sm:gap-2">
										<label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
											{t('recurring.endDate')}
										</label>
										<Input
											type="date"
											value={endDate}
											onChange={e => setEndDate(e.target.value)}
											min={date}
											className={`${getInputClassName(errors.endDate)} [color-scheme:light] dark:[color-scheme:dark]`}
										/>
										{errors.endDate && (
											<span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.endDate)}</span>
										)}
									</div>
								)}
								
								{/* Occurrences Count Input */}
								{endType === 'count' && (
									<div className="flex flex-col gap-1 sm:gap-2">
										<label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
											{t('recurring.occurrences')}
										</label>
										<Input
											type="number"
											min="1"
											placeholder="10"
											value={occurrencesLimit}
											onChange={e => setOccurrencesLimit(e.target.value)}
											className={getInputClassName(errors.occurrencesLimit)}
										/>
										{errors.occurrencesLimit && (
											<span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.occurrencesLimit)}</span>
										)}
									</div>
								)}
								
								{/* Recurring Summary */}
								<div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg">
									<span className="font-medium">📅 {t('recurring.summary')}: </span>
									{t('recurring.summaryText', {
									frequency: t(`recurring.${frequency}Summary`),
										interval: intervalCount,
										startDate: date
									})}
									{endType === 'date' && endDate && ` ${t('recurring.until')} ${endDate}`}
									{endType === 'count' && occurrencesLimit && ` ${t('recurring.for')} ${occurrencesLimit} ${t('recurring.times')}`}
								</div>
							</div>
						)}
					</div>
				)}

				{/* Date */}
				<div className="flex flex-col gap-1 sm:gap-2">
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
