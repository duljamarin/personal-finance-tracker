import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '../UI/Input'
import Button from '../UI/Button'
import { fetchCategories, addCategory } from '../../utils/api'
import { translateCategoryName, ICON_PALETTE, CATEGORY_ICONS, getCategoryIcon } from '../../utils/categoryTranslation'
import { useToast } from '../../context/ToastContext'
import { validateRecurringEndDate } from '../../utils/recurringValidation'
import { RECURRING_FREQUENCIES } from '../../utils/constants'
import { APP_CONFIG } from '../../config/app'
import { useSubscription } from '../../context/SubscriptionContext'
import { useAuth } from '../../context/AuthContext'
import TransactionSplitForm from './TransactionSplitForm'
import TransactionRecurringSection from './TransactionRecurringSection'
import { CategoryIconSvg } from '../UI/CategoryIconSvg'
import CustomSelect from '../UI/CustomSelect'
import { fetchExchangeRate } from '../../utils/exchangeRate'

export default function TransactionForm({ onSubmit, onCancel, initial, onCategoryAdded, allowRecurring = false }) {
	const { t } = useTranslation()
	const { canSplitTransaction } = useSubscription()
	const { user } = useAuth()
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
	const [proposedCategoryEmoji, setProposedCategoryEmoji] = useState('Shopping')
	const [categoryProposalSuccess, setCategoryProposalSuccess] = useState(false)
	const [currencyCode, setCurrencyCode] = useState(initial?.currency_code || initial?.currencyCode || user?.user_metadata?.preferred_currency || APP_CONFIG.BASE_CURRENCY)
	const [exchangeRate, setExchangeRate] = useState(parseFloat(Number(initial?.exchange_rate || initial?.exchangeRate || APP_CONFIG.DEFAULT_EXCHANGE_RATE).toFixed(3)))
	const [isFetchingRate, setIsFetchingRate] = useState(false)
	
	// If editing a transaction from a recurring rule
	const isFromRecurring = initial?.source_recurring_id

	// Split transaction state
	const [isSplit, setIsSplit] = useState((initial?.has_splits || false) && canSplitTransaction)
	const [splits, setSplits] = useState(initial?.splits || [])

	// Recurring transaction state
	const [isRecurring, setIsRecurring] = useState(initial?.isRecurring || false)
	const [frequency, setFrequency] = useState(initial?.frequency || RECURRING_FREQUENCIES.MONTHLY)
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
	}, [])

	const initialCurrencyRef = useRef(currencyCode)
	useEffect(() => {
		if (currencyCode === 'EUR') {
			setExchangeRate(1.0)
			return
		}
		// Don't auto-fetch on mount when editing an existing transaction that already has a rate
		if (currencyCode === initialCurrencyRef.current && initial?.id) return
		let cancelled = false
		setIsFetchingRate(true)
		fetchExchangeRate(currencyCode).then(rate => {
			if (!cancelled && rate !== null) setExchangeRate(parseFloat(rate.toFixed(3)))
			if (!cancelled) setIsFetchingRate(false)
		})
		return () => { cancelled = true }
	}, [currencyCode])

	function validate() {
		const newErrors = {}
		if (!title.trim()) newErrors.title = 'transactions.titleError'
		if (!amount || isNaN(amount) || Number(amount) <= 0) newErrors.amount = 'transactions.amountError'
		if (!date) newErrors.date = 'transactions.dateError'
		if (!type) newErrors.type = 'transactions.typeError'

		if (isSplit) {
			// Validate splits
			if (splits.length < 2) {
				newErrors.splits = 'split.needAtLeastTwo'
			} else {
				const total = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0)
				if (Math.abs(total - Number(amount)) > 0.01) {
					newErrors.splits = 'split.mustEqualTotal'
				}
				splits.forEach((sp, idx) => {
					if (!sp.category_id) newErrors[`split_${idx}_category`] = 'transactions.categoryError'
					if (!sp.amount || isNaN(sp.amount) || Number(sp.amount) <= 0) newErrors[`split_${idx}_amount`] = 'transactions.amountError'
				})
			}
		} else if (!categoryId || categoryId === '' || categoryId === 'other') {
			newErrors.categoryId = 'transactions.categoryError'
		}
		
		// Recurring validation
		if (isRecurring) {
			if (!intervalCount || isNaN(intervalCount) || Number(intervalCount) < 1) {
				newErrors.intervalCount = 'recurring.intervalError'
			}
			
			if (endType === 'date') {
				if (!endDate) {
					newErrors.endDate = 'recurring.endDateError'
				} else {
					const endDateError = validateRecurringEndDate(endDate, date, frequency, Number(intervalCount))
					if (endDateError) {
						newErrors.endDate = endDateError
					}
				}
			}
			
			if (endType === 'count') {
				if (!occurrencesLimit || isNaN(occurrencesLimit) || Number(occurrencesLimit) < 2) {
					newErrors.occurrencesLimit = 'recurring.occurrencesMinError'
				}
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
		
		// Re-validate end date if it exists and recurring is enabled
		if (isRecurring && endType === 'date' && endDate) {
			validateEndDate(endDate, value, frequency, intervalCount)
		}
	}

	function handleEndDateChange(e) {
		const value = e.target.value
		setEndDate(value)
		validateEndDate(value, date, frequency, intervalCount)
	}

	function handleIntervalCountChange(e) {
		const value = e.target.value
		setIntervalCount(value)

		// Re-validate end date if it exists
		if (endType === 'date' && endDate) {
			validateEndDate(endDate, date, frequency, value)
		}

		setErrors(prev => ({
			...prev,
			intervalCount: value && !isNaN(value) && Number(value) >= 1 ? undefined : 'recurring.intervalError'
		}))
	}

	function handleFrequencyChange(e) {
		const value = e.target.value
		setFrequency(value)

		// Re-validate end date if it exists
		if (endType === 'date' && endDate) {
			validateEndDate(endDate, date, value, intervalCount)
		}
	}

	function validateEndDate(selectedEndDate, startDate, freq, interval) {
		if (!selectedEndDate || !startDate) return

		const endDateError = validateRecurringEndDate(selectedEndDate, startDate, freq, Number(interval))
		
		setErrors(prev => ({
			...prev,
			endDate: endDateError || undefined
		}))
	}

	function handleCategoryChange(eOrValue) {
		const value = typeof eOrValue === 'string' ? eOrValue : eOrValue?.target?.value
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
			const newCategory = await addCategory({ name: proposedCategoryName.trim(), emoji: proposedCategoryEmoji })
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
			localStorage.setItem('lastUsedType', type)
		}

		const formData = {
			title: title.trim(),
			amount: Number(amount),
			date,
			categoryId: isSplit ? null : categoryId,
			type,
			tags: tagsList,
			currencyCode,
			exchangeRate: Number(exchangeRate),
			sourceRecurringId: initial?.source_recurring_id,
			// Split data
			has_splits: isSplit,
			splits: isSplit ? splits : null,
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

	return (
		<form onSubmit={submit} className="flex flex-col gap-3 sm:gap-5 w-full">
			<h2 className="text-lg sm:text-2xl font-semibold tracking-tight text-ink-primary dark:text-white mb-1 sm:mb-2 flex-shrink-0">
				{initial?.id ? t('transactions.editTransaction') : t('transactions.addNew')}
			</h2>

			<div className="flex flex-col gap-3 sm:gap-5">
				{/* Show recurring badge if editing a transaction from recurring rule */}
				{isFromRecurring && (
					<div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-2 sm:p-4">
						<div className="flex items-center gap-2 mb-2">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							<span className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300">
								{t('recurring.generatedFromRule')}
							</span>
						</div>
						<p className="text-xs text-purple-600 dark:text-purple-400 flex items-start gap-2">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>{t('recurring.editInstanceNote')}</span>
						</p>
					</div>
				)}
				
				{/* Title */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs sm:text-sm font-semibold text-ink-secondary dark:text-white">
						{t('transactions.titleLabel')}
					</label>
					<Input
						placeholder={t('transactions.titlePlaceholder')}
						value={title}
						onChange={handleTitleChange}
						error={errors.title ? t(errors.title) : undefined}
					/>
				</div>

				{/* Type & Amount — type toggle full width, amount + label inline */}
				<div className="flex flex-col gap-3">
					{/* Type toggle */}
					<div className="flex gap-2">
						{[
							{
								value: 'expense',
								label: t('transactions.expense'),
								icon: (
									<svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
										<path d="M3 7 L9 13 L13 10 L21 18" /><path d="M14 18 L21 18 L21 11" />
									</svg>
								),
								activeClass: 'bg-[#fef0f1] dark:bg-rose-950/30 border-[#e8394d] text-[#e8394d] dark:text-[#e8394d]',
								inactiveClass: 'bg-white dark:bg-surface-dark-card border-surface-hairline dark:border-surface-dark-hairline text-ink-muted dark:text-white hover:border-[#e8394d]/50',
							},
							{
								value: 'income',
								label: t('transactions.income'),
								icon: (
									<svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
										<path d="M3 17 L9 11 L13 14 L21 6" /><path d="M14 6 L21 6 L21 13" />
									</svg>
								),
								activeClass: 'bg-brand-50 dark:bg-brand-950/30 border-brand-500 text-brand-600 dark:text-brand-400',
								inactiveClass: 'bg-white dark:bg-surface-dark-card border-surface-hairline dark:border-surface-dark-hairline text-ink-muted dark:text-white hover:border-brand-300',
							},
						].map(opt => (
							<button
								key={opt.value}
								type="button"
								onClick={() => setType(opt.value)}
								className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border font-medium text-sm transition-colors ${type === opt.value ? opt.activeClass : opt.inactiveClass}`}
							>
								{opt.icon}
								{opt.label}
							</button>
						))}
					</div>
					{errors.type && (
						<span className="text-xs text-[#e8394d] font-medium">{t(errors.type)}</span>
					)}

					{/* Amount */}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs sm:text-sm font-semibold text-ink-secondary dark:text-white">
							{t('transactions.amountLabel')}
						</label>
						<Input
							type="number"
							placeholder={t('transactions.amountPlaceholder')}
							value={amount}
							onChange={handleAmountChange}
							error={errors.amount ? t(errors.amount) : undefined}
						/>
					</div>
				</div>

				{/* Currency Fields */}
				<div className="grid grid-cols-[1fr_1fr] gap-3 items-start">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs sm:text-sm font-semibold text-ink-secondary dark:text-white">
							{t('currency.code')}
						</label>
						<CustomSelect
							value={currencyCode}
							onChange={setCurrencyCode}
							ariaLabel={t('currency.code')}
							options={[
								{ value: 'USD', label: t('currency.USD'), leading: <span>🇺🇸</span> },
								{ value: 'EUR', label: t('currency.EUR'), leading: <span>🇪🇺</span> },
								{ value: 'GBP', label: t('currency.GBP'), leading: <span>🇬🇧</span> },
								{ value: 'ALL', label: t('currency.ALL'), leading: <span>🇦🇱</span> },
								{ value: 'CHF', label: t('currency.CHF'), leading: <span>🇨🇭</span> },
								{ value: 'JPY', label: t('currency.JPY'), leading: <span>🇯🇵</span> },
								{ value: 'CAD', label: t('currency.CAD'), leading: <span>🇨🇦</span> },
								{ value: 'AUD', label: t('currency.AUD'), leading: <span>🇦🇺</span> },
							]}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<div className="flex items-baseline gap-1.5">
							<label className="text-xs sm:text-sm font-semibold text-ink-secondary dark:text-white whitespace-nowrap">
								{t('currency.exchangeRate')}
							</label>
							{isFetchingRate
								? <span className="text-xs text-brand-500 dark:text-brand-400 font-normal animate-pulse">...</span>
								: <span className="text-xs text-ink-muted dark:text-white font-normal whitespace-nowrap">{t('currency.exchangeRateOptional')}</span>
							}
						</div>
						<Input
							type="number"
							step="0.001"
							placeholder="1.0"
							value={exchangeRate}
							onChange={e => setExchangeRate(e.target.value)}
							disabled={isFetchingRate}
						/>
					</div>
				</div>
				{currencyCode !== 'EUR' && (
					<p className="text-xs text-ink-muted dark:text-white -mt-2">
						{t('currency.baseAmount')}: €{(Number(amount || 0) * Number(exchangeRate || 1)).toFixed(2)}
					</p>
				)}

				{/* Category / Split Toggle - hide when recurring is enabled or editing recurring transaction */}
				<div className="flex flex-col gap-1 sm:gap-2">
					<div className="flex items-center justify-between min-h-[1.25rem]">
						{!isRecurring && !initial?.source_recurring_id && (
							canSplitTransaction ? (
								<button
									type="button"
									onClick={() => { setIsSplit(v => !v); setSplits([]); }}
								className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
								>
									<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
									</svg>
									{isSplit ? t('split.singleCategory') : t('split.enableSplit')}
								</button>
							) : (
								<span className="flex items-center gap-1.5 text-xs text-ink-muted/60 dark:text-white/60">
									<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
									</svg>
									{t('split.premiumOnly')}
								</span>
							)
						)}
					</div>
					{isSplit ? (
						<TransactionSplitForm
							totalAmount={Number(amount) || 0}
							categories={categories}
							initialSplits={splits}
							onSplitsChange={setSplits}
							errors={errors}
						/>
					) : (
					<>
					<div className="flex items-center gap-2">
						<div className="flex-1 min-w-0">
							<CustomSelect
								value={categoryId}
								onChange={handleCategoryChange}
								error={!!errors.categoryId}
								placeholder={t('transactions.selectCategory')}
								ariaLabel={t('transactions.selectCategory')}
								options={categories.map(cat => {
									const iconKey = getCategoryIcon(cat)
									return {
										value: cat.id,
										label: translateCategoryName(cat.name),
										leading: (
											<span className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
												<CategoryIconSvg iconKey={iconKey || 'Shopping'} className="w-3.5 h-3.5" />
											</span>
										),
									}
								})}
							/>
						</div>
						<button
							type="button"
							onClick={() => { setShowProposalInput(v => !v); setCategoryProposalSuccess(false); }}
							title={t('categoryProposal.other')}
							className={`flex-shrink-0 w-9 self-stretch rounded-md border flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
								showProposalInput
									? 'bg-brand-600 border-brand-600 text-white'
									: 'border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-muted dark:text-white hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400'
							}`}
						>
							<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
							</svg>
						</button>
					</div>
					{errors.categoryId && (
						<span className="text-xs text-[#e8394d] dark:text-[#e8394d] font-medium">{t(errors.categoryId)}</span>
					)}

					{showProposalInput && (
						<div className="mt-2 sm:mt-3 p-3 sm:p-4 bg-surface-subtle dark:bg-surface-dark-subtle border border-surface-hairline dark:border-surface-dark-hairline rounded-lg">
							<label className="text-xs sm:text-sm font-medium text-ink-primary dark:text-white mb-1 sm:mb-2 block">
								{t('categoryProposal.proposedName')}
							</label>
							<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<span className="w-9 h-9 rounded-md bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
										{CATEGORY_ICONS[proposedCategoryEmoji] && (
											<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
												<path d={CATEGORY_ICONS[proposedCategoryEmoji]} />
											</svg>
										)}
									</span>
									<Input
										placeholder={t('categoryProposal.proposedNamePlaceholder')}
										value={proposedCategoryName}
										onChange={e => setProposedCategoryName(e.target.value)}
										className="flex-1 border p-1.5 sm:p-2 text-xs sm:text-sm rounded-md bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 border-surface-hairline dark:border-surface-dark-hairline min-w-0"
									/>
								</div>
								<Button
									type="button"
									onClick={handleSubmitProposal}
									className="px-3 py-1.5 sm:px-4 sm:py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-md text-xs sm:text-sm whitespace-nowrap w-full sm:w-auto"
								>
									{t('categoryProposal.submit')}
								</Button>
							</div>
							{/* Icon picker */}
							<div className="mt-2 sm:mt-3">
								<label className="eyebrow mb-1.5 block">
									{t('categories.emojiLabel')}
								</label>
								<div className="grid grid-cols-8 sm:grid-cols-12 gap-1 max-h-32 overflow-y-auto scrollbar-hide p-2 bg-surface-subtle dark:bg-surface-dark-subtle rounded-md border border-surface-hairline dark:border-surface-dark-hairline">
									{ICON_PALETTE.map(key => (
										<button
											key={key}
											type="button"
											title={key}
											onClick={() => setProposedCategoryEmoji(key)}
											className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
												proposedCategoryEmoji === key
													? 'bg-brand-600 text-white'
													: 'text-ink-muted dark:text-white hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-600 dark:hover:text-brand-400'
											}`}
										>
											{CATEGORY_ICONS[key] && (
												<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
													<path d={CATEGORY_ICONS[key]} />
												</svg>
											)}
										</button>
									))}
								</div>
							</div>
							{categoryProposalSuccess && (
								<p className="text-xs text-brand-600 dark:text-brand-400 mt-2">
									{t('categoryProposal.submittedDesc')}
								</p>
							)}
						</div>
					)}
				</>
				)}
				</div>

				{/* Tags */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs sm:text-sm font-semibold text-ink-secondary dark:text-white">
						{t('transactions.tagsLabel')}
						<span className="text-xs text-ink-muted dark:text-white font-normal ml-1">
							{t('transactions.tagsOptional')}
						</span>
					</label>
					<Input
						placeholder={t('transactions.tagsPlaceholder')}
						value={tags}
						onChange={e => setTags(e.target.value)}
					/>
				</div>

				{/* Recurring Transaction Toggle - only show for new transactions, hide when split is enabled or editing split transaction */}
				{allowRecurring && !initial?.id && !initial?.source_recurring_id && !isSplit && !initial?.has_splits && (
					<TransactionRecurringSection
						isRecurring={isRecurring}
						onToggle={() => setIsRecurring(!isRecurring)}
						frequency={frequency}
						onFrequencyChange={handleFrequencyChange}
						intervalCount={intervalCount}
						onIntervalCountChange={handleIntervalCountChange}
						endType={endType}
						onEndTypeChange={setEndType}
						endDate={endDate}
						onEndDateChange={handleEndDateChange}
						occurrencesLimit={occurrencesLimit}
						onOccurrencesLimitChange={e => setOccurrencesLimit(e.target.value)}
						errors={errors}
						startDate={date}
					/>
				)}

				{/* Date */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs sm:text-sm font-semibold text-ink-secondary dark:text-white">
						{t('transactions.dateLabel')}
					</label>
					<Input
						type="date"
						value={date}
						onChange={handleDateChange}
						error={errors.date ? t(errors.date) : undefined}
						className="[color-scheme:light] dark:[color-scheme:dark]"
					/>
				</div>
			</div>

			{/* Buttons */}
			<div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-surface-hairline dark:border-surface-dark-hairline flex-col sm:flex-row flex-shrink-0">
				<Button
					type="button"
					variant="secondary"
					className="flex-1"
					onClick={onCancel}
				>
					{t('forms.cancel')}
				</Button>
				<Button
					type="submit"
					className="flex-1"
				>
					{t('transactions.saveTransaction')}
				</Button>
			</div>
		</form>
	)
}
