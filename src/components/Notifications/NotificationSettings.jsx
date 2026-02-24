import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../UI/Button';
import { useToast } from '../../context/ToastContext';
import { fetchNotificationSettings, updateNotificationSettings } from '../../utils/api';
import { getInputClassName } from '../../utils/classNames';

export default function NotificationSettings() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [settings, setSettings] = useState({
    budget_overrun_enabled: true,
    recurring_due_enabled: true,
    goal_milestone_enabled: true,
    trial_expiring_enabled: true,
    budget_threshold: 90, // Percentage
    recurring_advance_days: 1, // Days before due
    goal_milestone_percentage: 25 // Every 25% progress
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchNotificationSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings(settings);
      addToast(t('notifications.settingsSaved'), 'success');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      addToast(t('notifications.settingsSaveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">{t('messages.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('notifications.notificationTypes')}
        </h3>

        {/* Individual Notification Types */}
        <div className="space-y-3">
          {/* Budget Overrun */}
          <div className="border-l-4 border-red-400 pl-4 py-2">
            <label className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {t('notifications.types.budgetOverrun')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('notifications.types.budgetOverrunDesc')}
                </div>
                {settings.budget_overrun_enabled && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400">
                      {t('notifications.budgetThreshold')}:
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      step="5"
                      value={settings.budget_threshold}
                      onChange={(e) => handleChange('budget_threshold', Number(e.target.value))}
                      className="ml-2 w-20 px-2 py-1 text-sm rounded border dark:border-gray-600 dark:bg-gray-800"
                      disabled={!settings.email_enabled}
                    />
                    <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">%</span>
                  </div>
                )}
              </div>
              <input
                type="checkbox"
                checked={settings.budget_overrun_enabled}
                onChange={() => handleToggle('budget_overrun_enabled')}
                disabled={!settings.email_enabled}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
              />
            </label>
          </div>

          {/* Recurring Due */}
          <div className="border-l-4 border-blue-400 pl-4 py-2">
            <label className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {t('notifications.types.recurringDue')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('notifications.types.recurringDueDesc')}
                </div>
                {settings.recurring_due_enabled && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400">
                      {t('notifications.advanceDays')}:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={settings.recurring_advance_days}
                      onChange={(e) => handleChange('recurring_advance_days', Number(e.target.value))}
                      className="ml-2 w-20 px-2 py-1 text-sm rounded border dark:border-gray-600 dark:bg-gray-800"
                    />
                    <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">
                      {t('notifications.daysLabel')}
                    </span>
                  </div>
                )}
              </div>
              <input
                type="checkbox"
                checked={settings.recurring_due_enabled}
                onChange={() => handleToggle('recurring_due_enabled')}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>
          </div>

          {/* Goal Milestone */}
          <div className="border-l-4 border-emerald-400 pl-4 py-2">
            <label className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {t('notifications.types.goalMilestone')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('notifications.types.goalMilestoneDesc')}
                </div>
                {settings.goal_milestone_enabled && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400">
                      {t('notifications.milestoneInterval')}:
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="50"
                      step="5"
                      value={settings.goal_milestone_percentage}
                      onChange={(e) => handleChange('goal_milestone_percentage', Number(e.target.value))}
                      className="ml-2 w-20 px-2 py-1 text-sm rounded border dark:border-gray-600 dark:bg-gray-800"
                    />
                    <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">%</span>
                  </div>
                )}
              </div>
              <input
                type="checkbox"
                checked={settings.goal_milestone_enabled}
                onChange={() => handleToggle('goal_milestone_enabled')}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>
          </div>

          {/* Trial Expiring */}
          <div className="border-l-4 border-amber-400 pl-4 py-2">
            <label className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {t('notifications.types.trialExpiring')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('notifications.types.trialExpiringDesc')}
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.trial_expiring_enabled}
                onChange={() => handleToggle('trial_expiring_enabled')}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t dark:border-gray-700">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('account.saving') : t('forms.save')}
        </Button>
      </div>
    </div>
  );
}
