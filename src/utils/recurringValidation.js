/**
 * Utility functions for recurring transaction validation
 */

/**
 * Calculate the minimum valid end date based on frequency and interval
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} frequency - 'daily', 'weekly', 'monthly', or 'yearly'
 * @param {number} intervalCount - Number of frequency units
 * @returns {Date} Minimum end date
 */
export function calculateMinEndDate(startDate, frequency, intervalCount) {
	const interval = Number(intervalCount) || 1
	const start = new Date(startDate)
	let minEndDate = new Date(start)

	switch (frequency) {
		case 'daily':
			minEndDate.setDate(minEndDate.getDate() + interval)
			break
		case 'weekly':
			minEndDate.setDate(minEndDate.getDate() + (interval * 7))
			break
		case 'monthly':
			minEndDate.setMonth(minEndDate.getMonth() + interval)
			break
		case 'yearly':
			minEndDate.setFullYear(minEndDate.getFullYear() + interval)
			break
	}

	return minEndDate
}

/**
 * Get the minimum end date as ISO string for date input
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} frequency - 'daily', 'weekly', 'monthly', or 'yearly'
 * @param {number} intervalCount - Number of frequency units
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function getMinEndDateString(startDate, frequency, intervalCount) {
	const minDate = calculateMinEndDate(startDate, frequency, intervalCount)
	
	// Add one more day to ensure it's after the minimum
	minDate.setDate(minDate.getDate() + 1)
	
	// Also ensure it's not in the past
	const today = new Date()
	if (minDate < today) {
		return today.toISOString().split('T')[0]
	}
	
	return minDate.toISOString().split('T')[0]
}

/**
 * Validate end date for recurring transactions
 * @param {string} selectedEndDate - ISO date string (YYYY-MM-DD)
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} frequency - 'daily', 'weekly', 'monthly', or 'yearly'
 * @param {number} intervalCount - Number of frequency units
 * @returns {string|null} Error key or null if valid
 */
export function validateRecurringEndDate(selectedEndDate, startDate, frequency, intervalCount) {
	if (!selectedEndDate || !startDate) return null

	const today = new Date().toISOString().split('T')[0]
	
	// Check if end date is in the past
	if (selectedEndDate < today) {
		return 'recurring.endDatePastError'
	}

	// Check if end date is at least one interval after start date
	const minEndDate = calculateMinEndDate(startDate, frequency, intervalCount)
	const selectedDate = new Date(selectedEndDate)

	if (selectedDate <= minEndDate) {
		return 'recurring.endDateTooSoonError'
	}

	return null
}

/**
 * Validate recurring transaction form data
 * @param {Object} data - Form data
 * @param {number} data.intervalCount - Interval count
 * @param {string} data.frequency - Frequency type
 * @param {string} data.endType - 'never', 'date', or 'count'
 * @param {string} data.endDate - End date (ISO string)
 * @param {number} data.occurrencesLimit - Number of occurrences
 * @param {string} data.startDate - Start date (ISO string)
 * @returns {Object} Object with error keys
 */
export function validateRecurringForm(data) {
	const { intervalCount, frequency, endType, endDate, occurrencesLimit, startDate } = data
	const errors = {}

	// Validate interval count
	if (!intervalCount || isNaN(intervalCount) || Number(intervalCount) < 1) {
		errors.intervalCount = 'recurring.intervalError'
	}

	// Validate end date
	if (endType === 'date') {
		if (!endDate) {
			errors.endDate = 'recurring.endDateError'
		} else {
			const endDateError = validateRecurringEndDate(endDate, startDate, frequency, Number(intervalCount))
			if (endDateError) {
				errors.endDate = endDateError
			}
		}
	}

	// Validate occurrences limit
	if (endType === 'count') {
		if (!occurrencesLimit || isNaN(occurrencesLimit) || Number(occurrencesLimit) < 2) {
			errors.occurrencesLimit = 'recurring.occurrencesMinError'
		}
	}

	return errors
}
