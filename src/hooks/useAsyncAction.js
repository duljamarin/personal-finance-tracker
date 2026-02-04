import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';

/**
 * Custom hook for handling async actions with consistent error handling
 * @returns {Function} executeAction - Function to execute async actions
 */
export function useAsyncAction() {
  const { addToast } = useToast();
  const { t } = useTranslation();
  
  /**
   * Executes an async action with error handling and toast notifications
   * @param {Function} action - The async function to execute
   * @param {string} successMessage - Optional success message translation key
   * @param {string} errorMessage - Optional error message translation key
   * @returns {Promise<any>} Result of the action
   */
  const executeAction = async (action, successMessage, errorMessage = 'messages.error') => {
    try {
      const result = await action();
      if (successMessage) {
        addToast(t(successMessage), 'success');
      }
      return result;
    } catch (error) {
      console.error('Async action error:', error);
      addToast(t(errorMessage), 'error');
      throw error;
    }
  };
  
  return executeAction;
}
