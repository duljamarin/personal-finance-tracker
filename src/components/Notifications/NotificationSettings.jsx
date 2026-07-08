import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../UI/Button';
import { useToast } from '../../context/ToastContext';
import { fetchNotificationSettings, updateNotificationSettings } from '../../utils/api';

const numberInputClass =
  'ml-2 w-20 px-2 py-1 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition';

const toggleClass =
  'w-5 h-5 rounded accent-brand-600 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50';

export default function NotificationSettings() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [settings, setSettings] = useState({
    budget_overrun_enabled: true,
    recurring_due_enabled: true,
    goal_milestone_enabled: true,
    trial_expiring_enabled: true,
    budget_threshold: 90,
    recurring_advance_days: 1,
    goal_milestone_percentage: 25
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

  const clampRanges = {
    budget_threshold: [0, 100],
    recurring_advance_days: [0, 7],
    goal_milestone_percentage: [1, 100],
  };

  // Preselected advance-day options for the recurring reminder (0 = same day).
  const advanceDayOptions = [0, 1, 2, 3, 5, 7];

  const handleSave = async () => {
    setSaving(true);
    try {
      // Normalize numeric fields: an empty/invalid value (from clearing an
      // input) is clamped to its range so we never send '' to an integer column.
      const normalized = { ...settings };
      for (const [key, [min, max]] of Object.entries(clampRanges)) {
        const n = Number(normalized[key]);
        normalized[key] = normalized[key] === '' || Number.isNaN(n)
          ? min
          : Math.min(max, Math.max(min, n));
      }
      setSettings(normalized);
      await updateNotificationSettings(normalized);
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

  // Keep the raw string in state while typing so the field can be cleared (an
  // empty value would otherwise coerce to 0 immediately, blocking edits). It is
  // normalized+clamped on blur; the save handler also coerces, so a transient
  // '' never reaches the DB.
  const handleNumberChange = (key, raw) => {
    handleChange(key, raw === '' ? '' : Number(raw));
  };

  // Clamp numeric fields to their DB CHECK-constraint ranges on blur so a typed
  // or empty value (input min/max don't block typing) can't 400 on save.
  const handleNumberBlur = (key) => {
    const range = clampRanges[key];
    if (!range) return;
    const [min, max] = range;
    const n = Number(settings[key]);
    const clamped = settings[key] === '' || Number.isNaN(n)
      ? min
      : Math.min(max, Math.max(min, n));
    if (clamped !== settings[key]) handleChange(key, clamped);
  };

  if (loading) {
    return <div className="text-ink-muted dark:text-white">{t('messages.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold tracking-tight text-lg text-ink-primary dark:text-white mb-4">
          {t('notifications.notificationTypes')}
        </h3>

        {/* Individual Notification Types */}
        <div className="space-y-3">
          {/* Budget Overrun */}
          <div className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline px-4 py-3 border-l-4 border-l-expense">
            <label className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-ink-primary dark:text-white">
                  {t('notifications.types.budgetOverrun')}
                </div>
                <div className="text-sm text-ink-muted dark:text-white mt-1">
                  {t('notifications.types.budgetOverrunDesc')}
                </div>
                {settings.budget_overrun_enabled && (
                  <div className="mt-2">
                    <label className="text-xs text-ink-muted dark:text-white">
                      {t('notifications.budgetThreshold')}:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={settings.budget_threshold}
                      onChange={(e) => handleNumberChange('budget_threshold', e.target.value)}
                      onBlur={() => handleNumberBlur('budget_threshold')}
                      className={numberInputClass}
                      disabled={!settings.email_enabled}
                    />
                    <span className="ml-1 text-xs text-ink-muted dark:text-white">%</span>
                  </div>
                )}
              </div>
              <input
                type="checkbox"
                checked={settings.budget_overrun_enabled}
                onChange={() => handleToggle('budget_overrun_enabled')}
                disabled={!settings.email_enabled}
                className={toggleClass}
              />
            </label>
          </div>

          {/* Recurring Due */}
          <div className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline border-l-4 border-l-brand-500 px-4 py-3">
            <label className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-ink-primary dark:text-white">
                  {t('notifications.types.recurringDue')}
                </div>
                <div className="text-sm text-ink-muted dark:text-white mt-1">
                  {t('notifications.types.recurringDueDesc')}
                </div>
                {settings.recurring_due_enabled && (
                  <div className="mt-2">
                    <div className="text-xs text-ink-muted dark:text-white mb-1.5">
                      {t('notifications.advanceDays')}:
                    </div>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup">
                      {advanceDayOptions.map((days) => {
                        const active = Number(settings.recurring_advance_days) === days;
                        return (
                          <button
                            key={days}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={(e) => {
                              e.preventDefault();
                              handleChange('recurring_advance_days', days);
                            }}
                            className={
                              'min-w-[3rem] px-2.5 py-1 text-xs rounded-md border tabular-nums transition ' +
                              (active
                                ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-white font-medium'
                                : 'border-surface-hairline dark:border-surface-dark-hairline text-ink-muted dark:text-white hover:border-brand-500/50')
                            }
                          >
                            {days === 0
                              ? t('notifications.sameDay')
                              : `${days} ${t('notifications.daysLabel')}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <input
                type="checkbox"
                checked={settings.recurring_due_enabled}
                onChange={() => handleToggle('recurring_due_enabled')}
                className={toggleClass}
              />
            </label>
          </div>

          {/* Goal Milestone */}
          <div className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline border-l-4 border-l-data-blue px-4 py-3">
            <label className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-ink-primary dark:text-white">
                  {t('notifications.types.goalMilestone')}
                </div>
                <div className="text-sm text-ink-muted dark:text-white mt-1">
                  {t('notifications.types.goalMilestoneDesc')}
                </div>
                {settings.goal_milestone_enabled && (
                  <div className="mt-2">
                    <label className="text-xs text-ink-muted dark:text-white">
                      {t('notifications.milestoneInterval')}:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={settings.goal_milestone_percentage}
                      onChange={(e) => handleNumberChange('goal_milestone_percentage', e.target.value)}
                      onBlur={() => handleNumberBlur('goal_milestone_percentage')}
                      className={numberInputClass}
                    />
                    <span className="ml-1 text-xs text-ink-muted dark:text-white">%</span>
                  </div>
                )}
              </div>
              <input
                type="checkbox"
                checked={settings.goal_milestone_enabled}
                onChange={() => handleToggle('goal_milestone_enabled')}
                className={toggleClass}
              />
            </label>
          </div>

          {/* Trial Expiring */}
          <div className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline border-l-4 border-l-warning px-4 py-3">
            <label className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-ink-primary dark:text-white">
                  {t('notifications.types.trialExpiring')}
                </div>
                <div className="text-sm text-ink-muted dark:text-white mt-1">
                  {t('notifications.types.trialExpiringDesc')}
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.trial_expiring_enabled}
                onChange={() => handleToggle('trial_expiring_enabled')}
                className={toggleClass}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-surface-hairline dark:border-surface-dark-hairline">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('account.saving') : t('forms.save')}
        </Button>
      </div>
    </div>
  );
}
