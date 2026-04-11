import { useTranslation } from 'react-i18next'
import Input from '../UI/Input'
import { getInputClassName } from '../../utils/classNames'
import { getMinEndDateString } from '../../utils/recurringValidation'

export default function TransactionRecurringSection({
	isRecurring,
	onToggle,
	frequency,
	onFrequencyChange,
	intervalCount,
	onIntervalCountChange,
	endType,
	onEndTypeChange,
	endDate,
	onEndDateChange,
	occurrencesLimit,
	onOccurrencesLimitChange,
	errors,
	startDate,
}) {
	const { t } = useTranslation()

	return (
		<div className="flex flex-col gap-3 sm:gap-4 p-2 sm:p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
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
					onClick={onToggle}
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
								onChange={onFrequencyChange}
								className={getInputClassName(false)}
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
									onChange={onIntervalCountChange}
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
									onClick={() => onEndTypeChange(option)}
									className={`px-2 py-1.5 sm:px-3 sm:py-2 text-xs rounded-lg font-medium border transition-all ${
										endType === option
											? 'bg-purple-600 text-white border-purple-700'
											: 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:border-brand-400'
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
								onChange={onEndDateChange}
								min={getMinEndDateString(startDate, frequency, intervalCount)}
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
								onChange={onOccurrencesLimitChange}
								className={getInputClassName(errors.occurrencesLimit)}
							/>
							{errors.occurrencesLimit && (
								<span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.occurrencesLimit)}</span>
							)}
						</div>
					)}

					{/* Recurring Summary */}
					{!errors.intervalCount && !errors.endDate && !errors.occurrencesLimit && (
						<div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg">
							<span className="font-medium">📅 {t('recurring.summary')}: </span>
							{t('recurring.summaryText', {
								frequency: t(`recurring.${frequency}Summary`),
								interval: intervalCount,
								startDate: startDate
							})}
							{endType === 'date' && endDate && ` ${t('recurring.until')} ${endDate}`}
							{endType === 'count' && occurrencesLimit && ` ${t('recurring.for')} ${occurrencesLimit} ${t('recurring.times')}`}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
