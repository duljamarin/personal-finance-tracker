import Card from './Card';
import Button from './Button';

export default function EmptyState({ icon, title, description, action, actionLabel, limitText }) {
  return (
    <Card>
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          {description}
        </p>
        {limitText && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {limitText}
          </p>
        )}
        {action && (
          <Button onClick={action}>
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}
