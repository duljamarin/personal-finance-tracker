import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../UI/PageHeader';
import EmptyState from '../UI/EmptyState';
import { Bell, CheckCheck, Settings2 } from 'lucide-react';
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
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-surface-subtle dark:bg-surface-dark-subtle text-expense">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'recurring_due':
        return (
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-surface-subtle dark:bg-surface-dark-subtle text-brand-600 dark:text-brand-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'goal_milestone':
        return (
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-surface-subtle dark:bg-surface-dark-subtle text-brand-600 dark:text-brand-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'trial_expiring':
        return (
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-surface-subtle dark:bg-surface-dark-subtle text-warning">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-surface-subtle dark:bg-surface-dark-subtle text-ink-muted dark:text-white">
            <svg className="w-5 h-5 text-ink-muted dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  if (loading) {
    return <LoadingSpinner text={t('messages.loading')} />;
  }

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('notifications.title')}
        className="!mb-0"
        actions={
          <>
            {unread > 0 && (
              <Button variant="ghost" onClick={handleMarkAllAsRead}>
                <span className="inline-flex items-center gap-2">
                  <CheckCheck className="w-4 h-4" strokeWidth={1.75} />
                  {t('notifications.markAllAsRead')}
                </span>
              </Button>
            )}
            <Button onClick={() => setShowSettings(!showSettings)} variant="secondary" aria-expanded={showSettings}>
              <span className="inline-flex items-center gap-2">
                <Settings2 className="w-4 h-4" strokeWidth={1.75} />
                {t('notifications.settings')}
              </span>
            </Button>
          </>
        }
      />

      {showSettings && (
        <Card padding="lg">
          <NotificationSettings />
        </Card>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-5 h-5" strokeWidth={1.75} />}
          title={t('notifications.noNotifications')}
        />
      ) : (
        <section className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline overflow-hidden">
          <ul className="divide-y divide-surface-hairline dark:divide-surface-dark-hairline">
            {notifications.map(notification => {
              const { title: notifTitle, message: notifMessage } = getNotificationText(notification);
              const isUnread = !notification.is_read;
              return (
                <li key={notification.id} className="group relative flex items-start gap-4 px-4 sm:px-5 py-4">
                  {isUnread && (
                    <span className="absolute left-1.5 sm:left-2 top-6 w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400" aria-hidden="true" />
                  )}
                  {getNotificationIcon(notification.notification_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'} text-ink-primary dark:text-white`}>
                        {notifTitle}
                      </h3>
                      <span className="text-xs text-ink-muted dark:text-white whitespace-nowrap tabular-nums">
                        {new Date(notification.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted dark:text-white">{notifMessage}</p>
                    <div className="mt-2 flex items-center gap-4">
                      {isUnread && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          {t('notifications.markAsRead')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="text-xs font-medium text-ink-muted dark:text-white hover:text-expense dark:hover:text-expense"
                      >
                        {t('notifications.delete')}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
