import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { isDark, toggleDark } = useTheme();
  return (
    <button
      onClick={toggleDark}
      className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
    >
      {isDark ? `☀️ ${t('theme.light')}` : `🌙 ${t('theme.dark')}`}
    </button>
  )
}
