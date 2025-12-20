import { useTranslation } from 'react-i18next';

export default function ThemeToggle({ isDark, toggle }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={toggle}
      className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
    >
      {isDark ? `☀️ ${t('theme.light')}` : `🌙 ${t('theme.dark')}`}
    </button>
  )
}
