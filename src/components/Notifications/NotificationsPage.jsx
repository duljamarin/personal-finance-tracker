import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import NotificationSettings from './NotificationSettings';
import { useToast } from '../../context/ToastContext';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../../utils/api';
import { translateCategoryName } from '../../utils/categoryTranslation';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  // Resolve i18n keys stored in metadata (set by DB functions), fallback to stored text
  // Translates category name params so default categories show in the active language
  const getNotificationText = (notification) => {
    const meta = notification.metadata || {};

    const translateParams = (params) => {
      if (!params) return {};
      const out = { ...params };
      if (out.category) out.category = translateCategoryName(out.category);
      return out;
    };

    const title = meta.title_key
      ? t(meta.title_key, translateParams(meta.title_params))
      : notification.title;
    const message = meta.message_key
      ? t(meta.message_key, translateParams(meta.message_params))
      : notification.message;
    return { title, message };
  };
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      addToast(t('notifications.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      addToast(t('notifications.deleted'), 'success');
    } catch (error) {
      console.error('Error deleting notification:', error);
      addToast(t('notifications.deleteError'), 'error');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'budget_overrun':
        return (
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'recurring_due':
        return (
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'goal_milestone':
        return (
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'trial_expiring':
        return (
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  if (loading) {
    return <LoadingSpinner text={t('messages.loading')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('notifications.title')}
        </h1>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              {t('notifications.markAllAsRead')}
            </button>
          )}
          <Button onClick={() => setShowSettings(!showSettings)} variant="secondary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('notifications.settings')}
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="p-6">
          <NotificationSettings />
        </Card>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">{t('notifications.noNotifications')}</p>
          </Card>
        ) : (
          notifications.map(notification => {
            const { title: notifTitle, message: notifMessage } = getNotificationText(notification);
            return (
            <Card
              key={notification.id}
              className={`p-4 ${!notification.is_read ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : ''}`}
            >
              <div className="flex items-start gap-4">
                {getNotificationIcon(notification.notification_type)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-semibold ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {notifTitle}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(notification.created_at).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {notifMessage}
                  </p>
                  
                  <div className="mt-3 flex items-center gap-3">
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                      >
                        {t('notifications.markAsRead')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      {t('notifications.delete')}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
