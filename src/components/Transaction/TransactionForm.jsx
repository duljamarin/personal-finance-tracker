import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '../UI/Input'
import Button from '../UI/Button'
import { fetchCategories, addCategory } from '../../utils/api'
import { translateCategoryName, ICON_PALETTE, CATEGORY_ICONS, getCategoryIcon } from '../../utils/categoryTranslation'
import { useToast } from '../../context/ToastContext'
import { validateRecurringEndDate } from '../../utils/recurringValidation'
import { RECURRING_FREQUENCIES } from '../../utils/constants'
import { useSubscription } from '../../context/SubscriptionContext'
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency'
import TransactionSplitForm from './TransactionSplitForm'
import TransactionRecurringSection from './TransactionRecurringSection'
import { CategoryIconSvg } from '../UI/CategoryIconSvg'
import CustomSelect from '../UI/CustomSelect'
import SegmentedControl from '../UI/SegmentedControl'
import Chip from '../UI/Chip'
import CategoryAvatar from '../UI/CategoryAvatar'
import { useTransactions } from '../../context/TransactionContext'
import { ArrowLeftRight, Lock, Plus, Repeat } from 'lucide-react'

// Quick-add shows this many category chips (most used for the chosen type);
// the rest stay one tap away behind "More" (design-system 3.6).
const CHIP_COUNT = 6

export default function TransactionForm({ onSubmit, onCancel, initial, onCategoryAdded, allowRecurring = false }) {
	const { t } = useTranslation()
	const { canSplitTransaction } = useSubscription()
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
	// Single-currency app: every amount is entered and stored in the user's one
	// chosen currency, so there is no per-transaction picker and no FX rate.
	const { currency: currencyCode, symbol: currencySymbol } = useDisplayCurrency()

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

	const { transactions: allTransactions } = useTransactions()
	const [showMoreCategories, setShowMoreCategories] = useState(false)

	// Most used categories for the selected type, ties kept in list order.
	const chipCategories = useMemo(() => {
		const counts = new Map()
		for (const tx of allTransactions || []) {
			if (tx.type !== type) continue
			const id = tx.category?.id || tx.category_id
			if (id) counts.set(String(id), (counts.get(String(id)) || 0) + 1)
		}
		const ranked = [...categories].sort((a, b) => (counts.get(String(b.id)) || 0) - (counts.get(String(a.id)) || 0))
		const top = ranked.slice(0, CHIP_COUNT)
		// A category picked through "More" stays visible as a selected chip.
		const picked = categories.find(c => String(c.id) === String(categoryId))
		if (picked && !top.some(c => c.id === picked.id)) top.push(picked)
		return top
	}, [allTransactions, categories, type, categoryId])

	useEffect(() => {
		fetchCategories().then(cats => {
			setCategories(cats)
			if (initial?.category?.id && !categoryId) {
				setCategoryId(initial.category.id)
			}
		}).catch(() => setCategories([]))
	}, [])

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
			// Single currency, so base_amount always equals amount.
			exchangeRate: 1.0,
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
		<form onSubmit={submit} className="flex flex-col gap-4 w-full">
			<h2 className="text-h3 font-bold text-fg pr-12 flex-shrink-0">
				{initial?.id ? t('transactions.editTransaction') : t('transactions.addNew')}
			</h2>

			<div className="flex flex-col gap-4">
				{/* Show recurring badge if editing a transaction from recurring rule */}
				{isFromRecurring && (
					<div className="tile-inner p-gap">
						<div className="flex items-center gap-2 mb-1">
							<Repeat className="h-[18px] w-[18px] text-brand-text flex-shrink-0" strokeWidth={2} aria-hidden="true" />
							<span className="text-sm font-extrabold text-fg">
								{t('recurring.generatedFromRule')}
							</span>
						</div>
						<p className="text-sm font-semibold text-fg">
							{t('recurring.editInstanceNote')}
						</p>
					</div>
				)}

				{/* Type, then the amount as the visual hero of the form (36px / 800). */}
				<SegmentedControl
					ariaLabel={t('transactions.type')}
					value={type}
					onChange={setType}
					className="w-full"
					options={[
						{ value: 'expense', label: t('transactions.expense') },
						{ value: 'income', label: t('transactions.income') },
					]}
				/>
				{errors.type && (
					<span className="text-sm text-expense font-semibold">{t(errors.type)}</span>
				)}

				<div className="flex flex-col gap-1.5">
					<label htmlFor="tx-amount" className="text-sm font-bold text-fg">
						{t('transactions.amountLabel')}
					</label>
					<Input
						id="tx-amount"
						type="number"
						inputMode="decimal"
						placeholder={t('transactions.amountPlaceholder')}
						value={amount}
						onChange={handleAmountChange}
						error={errors.amount ? t(errors.amount) : undefined}
						leadingIcon={<span className="text-[36px] leading-none font-extrabold">{currencySymbol}</span>}
						// Room for multi-letter symbols (C$, CHF) beside the large figure.
						className={`!py-1.5 !text-[36px] !leading-tight !font-extrabold tabular-nums tracking-[-0.02em] ${
							(currencySymbol || '').length > 2 ? '!pl-24' : (currencySymbol || '').length > 1 ? '!pl-[4.5rem]' : '!pl-12'
						}`}
					/>
				</div>

				{/* Title */}
				<div className="flex flex-col gap-1.5">
					<label htmlFor="tx-title" className="text-sm font-bold text-fg">
						{t('transactions.titleLabel')}
					</label>
					<Input
						id="tx-title"
						placeholder={t('transactions.titlePlaceholder')}
						value={title}
						onChange={handleTitleChange}
						error={errors.title ? t(errors.title) : undefined}
					/>
				</div>

				{/* Category: chips for the most used + More (CustomSelect) + new category.
				    Split toggle hidden when recurring is enabled or editing a recurring row. */}
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2 min-h-[1.25rem]">
						<span className="text-sm font-bold text-fg">{t('transactions.category')}</span>
						{!isRecurring && !initial?.source_recurring_id && (
							canSplitTransaction ? (
								<button
									type="button"
									onClick={() => { setIsSplit(v => !v); setSplits([]); }}
									className="btn-motion inline-flex items-center gap-1.5 min-h-11 px-3 -mr-3 rounded-pill text-sm font-bold text-brand-text hover:bg-inner"
								>
									<ArrowLeftRight className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
									{isSplit ? t('split.singleCategory') : t('split.enableSplit')}
								</button>
							) : (
								<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg">
									<Lock className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
									{t('split.premiumOnly')}
								</span>
							)
						)}
					</div>
					{isSplit ? (
						<TransactionSplitForm
							totalAmount={Number(amount) || 0}
							currencyCode={currencyCode}
							categories={categories}
							initialSplits={splits}
							onSplitsChange={setSplits}
							errors={errors}
						/>
					) : (
					<>
					<div role="group" aria-label={t('transactions.selectCategory')} className="flex flex-wrap gap-2">
						{chipCategories.map(cat => {
							const iconKey = getCategoryIcon(cat)
							return (
								<Chip
									key={cat.id}
									selected={String(categoryId) === String(cat.id)}
									onClick={() => { handleCategoryChange(String(cat.id)); setShowMoreCategories(false) }}
								>
									{iconKey && <CategoryIconSvg iconKey={iconKey} className="w-4 h-4" />}
									{translateCategoryName(cat.name)}
								</Chip>
							)
						})}
						{categories.length > chipCategories.length && (
							<Chip selected={showMoreCategories} onClick={() => setShowMoreCategories(v => !v)}>
								{t('transactions.moreCategories')}
							</Chip>
						)}
						<Chip
							selected={showProposalInput}
							onClick={() => { setShowProposalInput(v => !v); setCategoryProposalSuccess(false); }}
							aria-label={t('categoryProposal.other')}
							title={t('categoryProposal.other')}
							className="!px-3"
						>
							<Plus className="w-4 h-4" strokeWidth={2.6} aria-hidden="true" />
						</Chip>
					</div>
					{showMoreCategories && (
						<CustomSelect
							defaultOpen
							value={categoryId}
							onChange={(v) => { handleCategoryChange(v); setShowMoreCategories(false) }}
							error={!!errors.categoryId}
							placeholder={t('transactions.selectCategory')}
							ariaLabel={t('transactions.selectCategory')}
							options={categories.map(cat => {
								const iconKey = getCategoryIcon(cat)
								return {
									value: cat.id,
									label: translateCategoryName(cat.name),
									leading: <CategoryAvatar category={cat} size="sm" />,
								}
							})}
						/>
					)}
					{errors.categoryId && (
						<span className="text-sm text-expense font-semibold">{t(errors.categoryId)}</span>
					)}

					{showProposalInput && (
						<div className="tile-inner p-gap flex flex-col gap-3">
							<label htmlFor="tx-new-category" className="text-sm font-bold text-fg">
								{t('categoryProposal.proposedName')}
							</label>
							<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<span className="w-11 h-11 rounded-icon bg-tile flex items-center justify-center text-brand-text flex-shrink-0" aria-hidden="true">
										{CATEGORY_ICONS[proposedCategoryEmoji] && (
											<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
												<path d={CATEGORY_ICONS[proposedCategoryEmoji]} />
											</svg>
										)}
									</span>
									<div className="flex-1 min-w-0">
										<Input
											id="tx-new-category"
											placeholder={t('categoryProposal.proposedNamePlaceholder')}
											value={proposedCategoryName}
											onChange={e => setProposedCategoryName(e.target.value)}
										/>
									</div>
								</div>
								<Button type="button" onClick={handleSubmitProposal} className="w-full sm:w-auto whitespace-nowrap">
									{t('categoryProposal.submit')}
								</Button>
							</div>
							{/* Icon picker */}
							<div>
								<p className="text-sm font-bold text-fg mb-1.5">
									{t('categories.emojiLabel')}
								</p>
								<div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-40 overflow-y-auto scrollbar-hide p-1.5 bg-tile rounded-input">
									{ICON_PALETTE.map(key => (
										<button
											key={key}
											type="button"
											title={key}
											aria-label={key}
											aria-pressed={proposedCategoryEmoji === key}
											onClick={() => setProposedCategoryEmoji(key)}
											className={`btn-motion w-11 h-11 flex items-center justify-center rounded-input ${
												proposedCategoryEmoji === key
													? 'bg-brand-600 text-white'
													: 'text-fg hover:bg-inner'
											}`}
										>
											{CATEGORY_ICONS[key] && (
												<svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
													<path d={CATEGORY_ICONS[key]} />
												</svg>
											)}
										</button>
									))}
								</div>
							</div>
							{categoryProposalSuccess && (
								<p className="text-sm font-semibold text-brand-text">
									{t('categoryProposal.submittedDesc')}
								</p>
							)}
						</div>
					)}
				</>
				)}
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{/* Date */}
					<div className="flex flex-col gap-1.5">
						<label htmlFor="tx-date" className="text-sm font-bold text-fg">
							{t('transactions.dateLabel')}
						</label>
						<Input
							id="tx-date"
							type="date"
							value={date}
							onChange={handleDateChange}
							error={errors.date ? t(errors.date) : undefined}
							className="[color-scheme:light] dark:[color-scheme:dark]"
						/>
					</div>
					{/* Tags */}
					<div className="flex flex-col gap-1.5">
						<label htmlFor="tx-tags" className="text-sm font-bold text-fg">
							{t('transactions.tagsLabel')}
							<span className="font-semibold ml-1">
								{t('transactions.tagsOptional')}
							</span>
						</label>
						<Input
							id="tx-tags"
							placeholder={t('transactions.tagsPlaceholder')}
							value={tags}
							onChange={e => setTags(e.target.value)}
						/>
					</div>
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

			</div>

			{/* Buttons */}
			<div className="flex gap-2 pt-2 flex-shrink-0">
				<Button
					type="button"
					variant="ghost"
					onClick={onCancel}
				>
					{t('forms.cancel')}
				</Button>
				<Button
					type="submit"
					size="lg"
					className="flex-1"
				>
					{t('transactions.saveTransaction')}
				</Button>
			</div>
		</form>
	)
}
