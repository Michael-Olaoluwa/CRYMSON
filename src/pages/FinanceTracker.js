import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './FinanceTracker.module.css';

const STORAGE_KEY_BASE = 'crymson_finance_entries';
const RECURRING_STORAGE_KEY_BASE = 'crymson_finance_recurring_plans';
const FINANCE_PREFS_STORAGE_KEY_BASE = 'crymson_finance_prefs';
const AUTH_SESSION_KEY = 'crymson_auth_session';
const AUTH_API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:5000`;

const ENTRY_TYPES = {
  income: 'Income',
  expense: 'Expense',
};

const ENTRY_TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

const CATEGORY_OPTIONS = {
  income: [
    'Allowance',
    'Part-time Work',
    'Scholarship',
    'Family Support',
    'Refund',
    'Gift',
    'Side Hustle',
    'Other Income',
  ],
  expense: [
    'Meals',
    'Transport',
    'Books & Notes',
    'Stationery',
    'Data / Internet',
    'Accommodation',
    'Laundry',
    'Exam Fees',
    'Project Materials',
    'Subscriptions',
    'Health',
    'Entertainment',
    'Emergency',
    'Other Expense',
  ],
};

const STUDENT_SPENDING_HINTS = [
  'Meals before class',
  'Transport to campus',
  'Project printing',
  'Airtime and data',
  'Exam registration',
];

const RECURRING_PRESETS = [
  {
    label: 'Data subscription',
    category: 'Data / Internet',
    amount: '20',
    frequency: 'weekly',
    note: 'Recurring data bundle',
    reminderDays: 3,
  },
  {
    label: 'Transport top-up',
    category: 'Transport',
    amount: '35',
    frequency: 'weekly',
    note: 'Campus commute money',
    reminderDays: 2,
  },
  {
    label: 'Rent payment',
    category: 'Accommodation',
    amount: '250',
    frequency: 'monthly',
    note: 'Housing payment reminder',
    reminderDays: 7,
  },
];

const RECURRING_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const REMINDER_OPTIONS = [
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '7 days before' },
];

const SAVINGS_GOAL_OPTIONS = [
  { value: 50, label: '$50' },
  { value: 100, label: '$100' },
  { value: 250, label: '$250' },
  { value: 500, label: '$500' },
];

const LOW_BALANCE_OPTIONS = [
  { value: 20, label: '$20' },
  { value: 50, label: '$50' },
  { value: 100, label: '$100' },
  { value: 250, label: '$250' },
];

const RECURRING_INTERVAL_DAYS = {
  weekly: 7,
  monthly: 30,
};

const createEntryId = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const formatMoney = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
}).format(amount);

const normalizeKind = (value) => (value === 'income' ? 'income' : 'expense');

const normalizeEntry = (entry) => {
  const kind = normalizeKind(entry?.kind);
  const validCategories = CATEGORY_OPTIONS[kind];
  const category = validCategories.includes(String(entry?.category || '').trim())
    ? String(entry.category).trim()
    : validCategories[0];
  const amount = Number(entry?.amount);

  return {
    id: String(entry?.id || createEntryId()),
    kind,
    category,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    note: String(entry?.note || '').trim(),
    date: String(entry?.date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    createdAt: String(entry?.createdAt || new Date().toISOString()),
    source: String(entry?.source || ''),
    recurringPlanId: String(entry?.recurringPlanId || ''),
  };
};

const getTodayDateKey = () => new Date().toISOString().slice(0, 10);

const addDaysToDateKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const normalizeRecurringPlan = (plan) => {
  const frequency = RECURRING_FREQUENCIES.some((item) => item.value === plan?.frequency)
    ? plan.frequency
    : 'monthly';
  const validCategories = CATEGORY_OPTIONS.expense;
  const category = validCategories.includes(String(plan?.category || '').trim())
    ? String(plan.category).trim()
    : validCategories[0];
  const amount = Number(plan?.amount);
  const startDate = String(plan?.startDate || '').slice(0, 10) || getTodayDateKey();
  const reminderDays = REMINDER_OPTIONS.some((item) => item.value === Number(plan?.reminderDays))
    ? Number(plan.reminderDays)
    : 3;

  return {
    id: String(plan?.id || createEntryId()),
    label: String(plan?.label || 'Recurring expense').trim() || 'Recurring expense',
    category,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    frequency,
    note: String(plan?.note || '').trim(),
    startDate,
    nextDueDate: String(plan?.nextDueDate || '').slice(0, 10) || startDate,
    reminderDays,
    active: plan?.active !== false,
  };
};

const createRecurringEntry = (plan, dueDate) => normalizeEntry({
  id: createEntryId(),
  kind: 'expense',
  category: plan.category,
  amount: plan.amount,
  note: plan.note || plan.label,
  date: dueDate,
  createdAt: new Date().toISOString(),
  source: 'recurring',
  recurringPlanId: plan.id,
});

const getDaysBetweenDateKeys = (fromDateKey, toDateKey) => {
  const fromDate = new Date(`${fromDateKey}T00:00:00`);
  const toDate = new Date(`${toDateKey}T00:00:00`);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null;
  }

  return Math.round((toDate - fromDate) / (24 * 60 * 60 * 1000));
};

const getRecurringAlertStatus = (plan, todayKey) => {
  const dueInDays = getDaysBetweenDateKeys(todayKey, plan.nextDueDate || plan.startDate || todayKey);
  if (dueInDays === null) {
    return null;
  }

  const reminderWindow = Number.isFinite(plan.reminderDays) ? plan.reminderDays : 3;
  if (dueInDays < 0 || dueInDays > reminderWindow) {
    return null;
  }

  return {
    dueInDays,
    isDueToday: dueInDays === 0,
  };
};

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed.token === 'string' ? parsed.token : '';
  } catch (error) {
    return '';
  }
};

const getFinancePrefsKey = (activeUserId) => `${FINANCE_PREFS_STORAGE_KEY_BASE}:${activeUserId || 'guest'}`;

const normalizeAcademicEvent = (event) => ({
  id: String(event?.id || ''),
  subject: String(event?.subject || '').trim(),
  title: String(event?.title || '').trim(),
  taskType: String(event?.taskType || '').trim().toLowerCase(),
  dueAt: String(event?.dueAt || ''),
  reminderDelayMinutes: Number(event?.reminderDelayMinutes) || 60,
  acknowledgedAt: String(event?.acknowledgedAt || ''),
  notes: String(event?.notes || '').trim(),
});

const getAcademicDeadlineAlert = (event, now = new Date()) => {
  const dueAtTime = new Date(event.dueAt || '').getTime();
  if (!Number.isFinite(dueAtTime)) {
    return null;
  }

  const reminderDelayMs = (Number(event.reminderDelayMinutes) || 60) * 60 * 1000;
  const alertAtTime = dueAtTime - reminderDelayMs;
  const nowTime = now.getTime();
  if (nowTime < alertAtTime || nowTime > dueAtTime) {
    return null;
  }

  const title = `${event.subject || 'Academic'}: ${event.title || 'Deadline'}`;
  return {
    id: event.id,
    title,
    dueAt: new Date(dueAtTime).toLocaleString(),
    alertAt: new Date(alertAtTime).toLocaleString(),
    timeRemainingMinutes: Math.max(0, Math.ceil((dueAtTime - nowTime) / (60 * 1000))),
  };
};

const isTuitionOrFeeEvent = (event) => {
  const combined = `${event.subject || ''} ${event.title || ''} ${event.notes || ''}`.toLowerCase();
  return /tuition|fee|fees|payment|registration|school fee|college fee|semester fee/.test(combined)
    || ['submission-deadline', 'exam-timetable'].includes(String(event.taskType || '').toLowerCase());
};

const getFinancePrefs = (activeUserId) => {
  try {
    const raw = localStorage.getItem(getFinancePrefsKey(activeUserId));
    if (!raw) {
      return {
        savingsGoalAmount: 100,
        lowBalanceThreshold: 50,
        hideBalanceOnDashboard: false,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      savingsGoalAmount: Number.isFinite(Number(parsed?.savingsGoalAmount)) && Number(parsed.savingsGoalAmount) > 0
        ? Number(parsed.savingsGoalAmount)
        : 100,
      lowBalanceThreshold: Number.isFinite(Number(parsed?.lowBalanceThreshold)) && Number(parsed.lowBalanceThreshold) >= 0
        ? Number(parsed.lowBalanceThreshold)
        : 50,
      hideBalanceOnDashboard: typeof parsed?.hideBalanceOnDashboard === 'boolean'
        ? parsed.hideBalanceOnDashboard
        : false,
    };
  } catch (error) {
    return {
      savingsGoalAmount: 100,
      lowBalanceThreshold: 50,
      hideBalanceOnDashboard: false,
    };
  }
};

const getStorageKey = (activeUserId) => `${STORAGE_KEY_BASE}:${activeUserId || 'guest'}`;
const getRecurringStorageKey = (activeUserId) => `${RECURRING_STORAGE_KEY_BASE}:${activeUserId || 'guest'}`;

function FinanceTracker({ activeUserId = 'guest', onNavigateHome }) {
  const storageKey = useMemo(() => getStorageKey(activeUserId), [activeUserId]);
  const recurringStorageKey = useMemo(() => getRecurringStorageKey(activeUserId), [activeUserId]);
  const financePrefsKey = useMemo(() => getFinancePrefsKey(activeUserId), [activeUserId]);
  const [entries, setEntries] = useState([]);
  const [recurringPlans, setRecurringPlans] = useState([]);
  const [academicEvents, setAcademicEvents] = useState([]);
  const [financePrefs, setFinancePrefs] = useState(() => getFinancePrefs(activeUserId));
  const [entryType, setEntryType] = useState('expense');
  const [category, setCategory] = useState(CATEGORY_OPTIONS.expense[0]);
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [editingEntryId, setEditingEntryId] = useState('');
  const [planLabel, setPlanLabel] = useState('');
  const [planCategory, setPlanCategory] = useState(CATEGORY_OPTIONS.expense[0]);
  const [planAmount, setPlanAmount] = useState('');
  const [planFrequency, setPlanFrequency] = useState('monthly');
  const [planStartDate, setPlanStartDate] = useState(() => getTodayDateKey());
  const [planNote, setPlanNote] = useState('');
  const [planReminderDays, setPlanReminderDays] = useState('3');
  const [editingPlanId, setEditingPlanId] = useState('');
  const notifiedReminderKeysRef = useRef(new Set());
  const notifiedAcademicAlertKeysRef = useRef(new Set());
  const hasHydratedEntriesRef = useRef(false);
  const hasHydratedRecurringRef = useRef(false);
  const hasHydratedPrefsRef = useRef(false);
  const hasHydratedRemoteFinanceRef = useRef(false);
  const financeSyncTimeoutRef = useRef(null);

  useEffect(() => {
    hasHydratedEntriesRef.current = false;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setEntries(parsed.map(normalizeEntry));
        } else {
          setEntries([]);
        }
      } else {
        setEntries([]);
      }
    } catch (error) {
      setEntries([]);
    } finally {
      hasHydratedEntriesRef.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    hasHydratedRecurringRef.current = false;

    try {
      const raw = localStorage.getItem(recurringStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecurringPlans(parsed.map(normalizeRecurringPlan));
        } else {
          setRecurringPlans([]);
        }
      } else {
        setRecurringPlans([]);
      }
    } catch (error) {
      setRecurringPlans([]);
    } finally {
      hasHydratedRecurringRef.current = true;
    }
  }, [recurringStorageKey]);

  useEffect(() => {
    if (!hasHydratedEntriesRef.current) {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, storageKey]);

  useEffect(() => {
    if (!hasHydratedRecurringRef.current) {
      return;
    }

    localStorage.setItem(recurringStorageKey, JSON.stringify(recurringPlans));
  }, [recurringPlans, recurringStorageKey]);

  useEffect(() => {
    if (!hasHydratedPrefsRef.current) {
      hasHydratedPrefsRef.current = true;
      return;
    }

    localStorage.setItem(financePrefsKey, JSON.stringify(financePrefs));
  }, [financePrefs, financePrefsKey]);

  useEffect(() => {
    const validCategories = CATEGORY_OPTIONS[entryType];
    if (!validCategories.includes(category)) {
      setCategory(validCategories[0]);
    }
  }, [entryType, category]);

  useEffect(() => {
    setFinancePrefs(getFinancePrefs(activeUserId));
  }, [activeUserId]);

  useEffect(() => {
    let cancelled = false;
    hasHydratedRemoteFinanceRef.current = false;

    const loadRemoteFinance = async () => {
      const token = getStoredToken();
      if (!token) {
        hasHydratedRemoteFinanceRef.current = true;
        return;
      }

      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/user-state/finance`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) {
          return;
        }

        const remoteFinance = payload.finance && typeof payload.finance === 'object'
          ? payload.finance
          : null;

        if (!remoteFinance) {
          return;
        }

        if (Array.isArray(remoteFinance.entries) && remoteFinance.entries.length > 0) {
          setEntries(remoteFinance.entries.map(normalizeEntry));
        }

        if (Array.isArray(remoteFinance.recurringPlans) && remoteFinance.recurringPlans.length > 0) {
          setRecurringPlans(remoteFinance.recurringPlans.map(normalizeRecurringPlan));
        }

        if (remoteFinance.prefs && typeof remoteFinance.prefs === 'object') {
          setFinancePrefs((prev) => ({
            ...prev,
            ...getFinancePrefs(activeUserId),
            ...remoteFinance.prefs,
          }));
        }
      } catch (error) {
        // Keep local finance data if remote load fails.
      } finally {
        hasHydratedRemoteFinanceRef.current = true;
      }
    };

    loadRemoteFinance();

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !hasHydratedRemoteFinanceRef.current) {
      return undefined;
    }

    if (financeSyncTimeoutRef.current) {
      window.clearTimeout(financeSyncTimeoutRef.current);
    }

    financeSyncTimeoutRef.current = window.setTimeout(async () => {
      try {
        await fetch(`${AUTH_API_BASE_URL}/api/user-state/all`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            data: {
              finance: {
                entries,
                recurringPlans,
                prefs: financePrefs,
              },
            },
          }),
        });
      } catch (error) {
        // Keep local finance state even if remote sync fails.
      }
    }, 350);

    return () => {
      if (financeSyncTimeoutRef.current) {
        window.clearTimeout(financeSyncTimeoutRef.current);
      }
    };
  }, [entries, recurringPlans, financePrefs]);

  useEffect(() => {
    let cancelled = false;

    const loadAcademicEvents = async () => {
      const token = getStoredToken();
      if (!token) {
        setAcademicEvents([]);
        return;
      }

      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/academic-events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) {
          return;
        }

        const events = Array.isArray(payload.events) ? payload.events : [];
        setAcademicEvents(events.map(normalizeAcademicEvent));
      } catch (error) {
        if (!cancelled) {
          setAcademicEvents([]);
        }
      }
    };

    loadAcademicEvents();

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  useEffect(() => {
    const todayKey = getTodayDateKey();
    let generatedEntryCount = 0;

    const nextPlans = recurringPlans.map((plan) => {
      if (!plan.active) {
        return plan;
      }

      let nextDueDate = plan.nextDueDate || plan.startDate || todayKey;
      const newEntries = [];

      while (nextDueDate <= todayKey) {
        newEntries.push(createRecurringEntry(plan, nextDueDate));
        generatedEntryCount += 1;
        nextDueDate = addDaysToDateKey(nextDueDate, RECURRING_INTERVAL_DAYS[plan.frequency] || 30);
      }

      if (newEntries.length > 0) {
        setEntries((prev) => {
          const existingRecurringKeys = new Set(
            prev
              .filter((entry) => entry.source === 'recurring' && entry.recurringPlanId === plan.id)
              .map((entry) => `${entry.recurringPlanId}:${entry.date}`)
          );

          const merged = [...prev];
          newEntries.forEach((entry) => {
            const key = `${entry.recurringPlanId}:${entry.date}`;
            if (!existingRecurringKeys.has(key)) {
              merged.unshift(entry);
              existingRecurringKeys.add(key);
            }
          });
          return merged;
        });
      }

      return {
        ...plan,
        nextDueDate,
      };
    });

    if (generatedEntryCount > 0) {
      setRecurringPlans(nextPlans);
    }
  }, [recurringPlans]);

  const entryStats = useMemo(() => {
    const income = entries.reduce((sum, entry) => sum + (entry.kind === 'income' ? entry.amount : 0), 0);
    const expense = entries.reduce((sum, entry) => sum + (entry.kind === 'expense' ? entry.amount : 0), 0);
    const balance = income - expense;
    const thisMonthPrefix = new Date().toISOString().slice(0, 7);
    const monthEntries = entries.filter((entry) => String(entry.date || '').startsWith(thisMonthPrefix));
    const monthIncome = monthEntries.reduce((sum, entry) => sum + (entry.kind === 'income' ? entry.amount : 0), 0);
    const monthExpense = monthEntries.reduce((sum, entry) => sum + (entry.kind === 'expense' ? entry.amount : 0), 0);

    return {
      income,
      expense,
      balance,
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      transactionCount: entries.length,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => filter === 'all' || entry.kind === filter)
      .slice()
      .sort((left, right) => new Date(right.date || right.createdAt) - new Date(left.date || left.createdAt));
  }, [entries, filter]);

  const categoryTotals = useMemo(() => {
    const totals = entries.reduce((acc, entry) => {
      const key = `${entry.kind}:${entry.category}`;
      acc[key] = (acc[key] || 0) + entry.amount;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([key, total]) => {
        const [kind, entryCategory] = key.split(':');
        return { kind, entryCategory, total };
      })
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);
  }, [entries]);

  const recurringSummary = useMemo(() => {
    const activePlans = recurringPlans.filter((plan) => plan.active);
    const nextDuePlan = activePlans
      .slice()
      .sort((left, right) => new Date(left.nextDueDate || left.startDate) - new Date(right.nextDueDate || right.startDate))[0] || null;

    const monthlyRecurringTotal = activePlans.reduce((sum, plan) => {
      const multiplier = plan.frequency === 'weekly' ? 4 : 1;
      return sum + (plan.amount * multiplier);
    }, 0);

    const todayKey = getTodayDateKey();
    const dueSoonPlans = activePlans
      .map((plan) => ({
        plan,
        alert: getRecurringAlertStatus(plan, todayKey),
      }))
      .filter((item) => item.alert)
      .sort((left, right) => left.alert.dueInDays - right.alert.dueInDays);

    return {
      activePlansCount: activePlans.length,
      nextDuePlan,
      monthlyRecurringTotal,
      dueSoonPlans,
    };
  }, [recurringPlans]);

  const monthlySummary = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const monthEntries = entries.filter((entry) => String(entry.date || '').startsWith(currentMonthKey));
    const monthIncome = monthEntries.reduce((sum, entry) => sum + (entry.kind === 'income' ? entry.amount : 0), 0);
    const monthExpense = monthEntries.reduce((sum, entry) => sum + (entry.kind === 'expense' ? entry.amount : 0), 0);
    const monthSavings = Math.max(0, monthIncome - monthExpense);
    const savingsGoalAmount = Number.isFinite(Number(financePrefs.savingsGoalAmount))
      ? Number(financePrefs.savingsGoalAmount)
      : 100;
    const progressPercent = savingsGoalAmount > 0 ? Math.min(100, (monthSavings / savingsGoalAmount) * 100) : 0;

    return {
      monthIncome,
      monthExpense,
      monthSavings,
      savingsGoalAmount,
      progressPercent,
      remainingToGoal: Math.max(0, savingsGoalAmount - monthSavings),
    };
  }, [entries, financePrefs.savingsGoalAmount]);

  const lowBalanceWarning = useMemo(() => {
    const lowBalanceThreshold = Number.isFinite(Number(financePrefs.lowBalanceThreshold))
      ? Number(financePrefs.lowBalanceThreshold)
      : 50;
    const warnings = [];

    if (entryStats.balance <= lowBalanceThreshold) {
      warnings.push(`Your current balance is at ${formatMoney(entryStats.balance)}. Keep at least ${formatMoney(lowBalanceThreshold)} available.`);
    }

    if (monthlySummary.monthExpense > monthlySummary.monthIncome) {
      warnings.push('This month your spending is higher than your income.');
    }

    return {
      threshold: lowBalanceThreshold,
      warnings,
      isCritical: warnings.length > 0,
    };
  }, [entryStats.balance, financePrefs.lowBalanceThreshold, monthlySummary.monthExpense, monthlySummary.monthIncome]);

  const tuitionFeeAlerts = useMemo(() => {
    const now = new Date();

    return academicEvents
      .filter((event) => isTuitionOrFeeEvent(event))
      .filter((event) => !event.acknowledgedAt)
      .map((event) => ({
        event,
        alert: getAcademicDeadlineAlert(event, now),
      }))
      .filter((item) => item.alert)
      .sort((left, right) => new Date(left.event.dueAt) - new Date(right.event.dueAt));
  }, [academicEvents]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    recurringSummary.dueSoonPlans.forEach(({ plan, alert }) => {
      const alertKey = `${plan.id}:${plan.nextDueDate}:${plan.reminderDays}:${alert.dueInDays}`;
      if (notifiedReminderKeysRef.current.has(alertKey)) {
        return;
      }

      new Notification('Crymson Finance Reminder', {
        body: `${plan.label} is due ${alert.isDueToday ? 'today' : `in ${alert.dueInDays} day${alert.dueInDays === 1 ? '' : 's'}`}.`,
      });
      notifiedReminderKeysRef.current.add(alertKey);
    });
  }, [recurringSummary.dueSoonPlans]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    tuitionFeeAlerts.forEach(({ event, alert }) => {
      const alertKey = `${event.id}:${event.dueAt}:${event.reminderDelayMinutes}`;
      if (notifiedAcademicAlertKeysRef.current.has(alertKey)) {
        return;
      }

      new Notification('Crymson Tuition Reminder', {
        body: `${alert.title} is due in ${alert.timeRemainingMinutes} minute${alert.timeRemainingMinutes === 1 ? '' : 's'}.`,
      });
      notifiedAcademicAlertKeysRef.current.add(alertKey);
    });
  }, [tuitionFeeAlerts]);

  const resetForm = ({ keepMessage = false } = {}) => {
    setAmount('');
    setNote('');
    setEditingEntryId('');
    setEntryType('expense');
    setCategory(CATEGORY_OPTIONS.expense[0]);
    setEntryDate(new Date().toISOString().slice(0, 10));
    if (!keepMessage) {
      setMessage('');
    }
  };

  const handleSubmit = () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage('Enter a valid amount greater than zero.');
      return;
    }

    const validCategories = CATEGORY_OPTIONS[entryType];
    const normalizedCategory = validCategories.includes(category) ? category : validCategories[0];
    const payload = normalizeEntry({
      id: editingEntryId || createEntryId(),
      kind: entryType,
      category: normalizedCategory,
      amount: numericAmount,
      note,
      date: entryDate,
      createdAt: editingEntryId
        ? (entries.find((entry) => entry.id === editingEntryId)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
    });

    setEntries((prev) => {
      if (editingEntryId) {
        return prev.map((entry) => (entry.id === editingEntryId ? payload : entry));
      }
      return [payload, ...prev];
    });

    setMessage(editingEntryId ? 'Entry updated.' : `${ENTRY_TYPES[entryType]} logged.`);
    resetForm({ keepMessage: true });
  };

  const handleEdit = (entry) => {
    setEditingEntryId(entry.id);
    setEntryType(entry.kind);
    setCategory(entry.category);
    setAmount(String(entry.amount || ''));
    setEntryDate(entry.date || new Date().toISOString().slice(0, 10));
    setNote(entry.note || '');
    setMessage('Editing an existing entry.');
  };

  const handleDelete = (entryId) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    if (editingEntryId === entryId) {
      resetForm();
    }
  };

  const resetRecurringForm = ({ keepMessage = false } = {}) => {
    setPlanLabel('');
    setPlanCategory(CATEGORY_OPTIONS.expense[0]);
    setPlanAmount('');
    setPlanFrequency('monthly');
    setPlanStartDate(getTodayDateKey());
    setPlanNote('');
    setPlanReminderDays('3');
    setEditingPlanId('');
    if (!keepMessage) {
      setMessage('');
    }
  };

  const handleSaveRecurringPlan = () => {
    const normalizedLabel = String(planLabel || '').trim();
    const numericAmount = Number(planAmount);

    if (!normalizedLabel) {
      setMessage('Add a name for the recurring expense.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage('Enter a valid recurring amount greater than zero.');
      return;
    }

    const validCategories = CATEGORY_OPTIONS.expense;
    const normalizedCategory = validCategories.includes(planCategory) ? planCategory : validCategories[0];
    const normalizedFrequency = RECURRING_FREQUENCIES.some((item) => item.value === planFrequency)
      ? planFrequency
      : 'monthly';
    const normalizedReminderDays = REMINDER_OPTIONS.some((item) => item.value === Number(planReminderDays))
      ? Number(planReminderDays)
      : 3;

    const payload = normalizeRecurringPlan({
      id: editingPlanId || createEntryId(),
      label: normalizedLabel,
      category: normalizedCategory,
      amount: numericAmount,
      frequency: normalizedFrequency,
      note: planNote,
      startDate: planStartDate,
      reminderDays: normalizedReminderDays,
      nextDueDate: editingPlanId
        ? (recurringPlans.find((plan) => plan.id === editingPlanId)?.nextDueDate || planStartDate)
        : planStartDate,
      active: true,
    });

    setRecurringPlans((prev) => {
      if (editingPlanId) {
        return prev.map((plan) => (plan.id === editingPlanId ? payload : plan));
      }

      return [payload, ...prev];
    });

    setMessage(editingPlanId ? 'Recurring expense updated.' : 'Recurring expense saved.');
    resetRecurringForm({ keepMessage: true });
  };

  const handleEditRecurringPlan = (plan) => {
    setEditingPlanId(plan.id);
    setPlanLabel(plan.label || '');
    setPlanCategory(plan.category || CATEGORY_OPTIONS.expense[0]);
    setPlanAmount(String(plan.amount || ''));
    setPlanFrequency(plan.frequency || 'monthly');
    setPlanStartDate(plan.startDate || getTodayDateKey());
    setPlanNote(plan.note || '');
    setPlanReminderDays(String(plan.reminderDays || 3));
    setMessage('Editing a recurring expense.');
  };

  const handleDeleteRecurringPlan = (planId) => {
    setRecurringPlans((prev) => prev.filter((plan) => plan.id !== planId));
    if (editingPlanId === planId) {
      resetRecurringForm();
    }
  };

  const applyRecurringPreset = (preset) => {
    setEntryType('expense');
    setPlanLabel(preset.label);
    setPlanCategory(preset.category);
    setPlanAmount(preset.amount);
    setPlanFrequency(preset.frequency);
    setPlanNote(preset.note);
    setPlanReminderDays(String(preset.reminderDays || 3));
    setPlanStartDate(getTodayDateKey());
    setMessage(`Preset loaded for ${preset.label}.`);
  };

  const activeCategoryOptions = CATEGORY_OPTIONS[entryType];
  const dueSoonPlans = recurringSummary.dueSoonPlans;

  const handleEnableBrowserAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setMessage('Browser alerts are not supported here.');
      return;
    }

    const permission = await Notification.requestPermission();
    setMessage(permission === 'granted'
      ? 'Browser alerts enabled for recurring payments.'
      : 'Browser alerts were not enabled.');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Crymson Finance</p>
          <h1 className={styles.title}>Income and Expense Log</h1>
          <p className={styles.subtitle}>
            Track student cash flow with categories that actually fit campus life: meals, transport,
            data, books, fees, allowance, and more.
          </p>
        </div>

        <button type="button" className={styles.backButton} onClick={onNavigateHome}>
          Back to Home
        </button>
      </header>

      <section className={styles.heroGrid}>
        <article className={`${styles.heroCard} ${styles.balanceCard}`}>
          <p className={styles.cardLabel}>Current Balance</p>
          <strong className={styles.balanceValue}>{formatMoney(entryStats.balance)}</strong>
          <p className={styles.cardNote}>{entryStats.balance >= 0 ? 'Positive cash flow' : 'Spending is ahead of income'}</p>
        </article>

        <article className={styles.heroCard}>
          <p className={styles.cardLabel}>This Month</p>
          <strong className={styles.metricValue}>{formatMoney(entryStats.monthBalance)}</strong>
          <p className={styles.cardNote}>{formatMoney(entryStats.monthIncome)} income, {formatMoney(entryStats.monthExpense)} expense</p>
        </article>

        <article className={styles.heroCard}>
          <p className={styles.cardLabel}>Transactions</p>
          <strong className={styles.metricValue}>{entryStats.transactionCount}</strong>
          <p className={styles.cardNote}>{formatMoney(entryStats.income)} earned, {formatMoney(entryStats.expense)} spent</p>
        </article>
      </section>

      <section className={styles.recurringBanner}>
        <div>
          <p className={styles.cardLabel}>Recurring Expenses</p>
          <h2 className={styles.sectionTitle}>Keep fixed student costs on repeat</h2>
          <p className={styles.cardNote}>
            Auto-log essentials like data subscriptions, transport, and rent so they always show up in your budget.
          </p>
          <div className={styles.alertRow}>
            <span className={styles.alertBadge}>
              {dueSoonPlans.length > 0
                ? `${dueSoonPlans.length} reminder${dueSoonPlans.length === 1 ? '' : 's'} due soon`
                : 'No payments due within the reminder window'}
            </span>
            {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
              <button type="button" className={styles.alertActionButton} onClick={handleEnableBrowserAlerts}>
                Enable browser alerts
              </button>
            )}
          </div>
        </div>
        <div className={styles.recurringMetrics}>
          <article>
            <span>Active plans</span>
            <strong>{recurringSummary.activePlansCount}</strong>
          </article>
          <article>
            <span>Monthly recurring</span>
            <strong>{formatMoney(recurringSummary.monthlyRecurringTotal)}</strong>
          </article>
        </div>
      </section>

      <section className={styles.insightGrid}>
        <article className={styles.insightCard}>
          <p className={styles.cardLabel}>Monthly Spending Summary</p>
          <strong className={styles.metricValue}>{formatMoney(monthlySummary.monthExpense)}</strong>
          <p className={styles.cardNote}>
            Income: {formatMoney(monthlySummary.monthIncome)} · Savings: {formatMoney(monthlySummary.monthSavings)}
          </p>
          <div className={styles.progressBarTrack}>
            <span className={styles.progressBarFill} style={{ width: `${Math.max(4, Math.min(100, (monthlySummary.monthExpense / Math.max(1, monthlySummary.monthIncome || monthlySummary.monthExpense)) * 100))}%` }} />
          </div>
        </article>

        <article className={styles.insightCard}>
          <p className={styles.cardLabel}>Savings Goal Tracking</p>
          <strong className={styles.metricValue}>{formatMoney(monthlySummary.monthSavings)}</strong>
          <p className={styles.cardNote}>
            Goal: {formatMoney(monthlySummary.savingsGoalAmount)} · Remaining: {formatMoney(monthlySummary.remainingToGoal)}
          </p>
          <div className={styles.progressBarTrack}>
            <span className={styles.progressBarFillAlt} style={{ width: `${Math.max(4, Math.min(100, monthlySummary.progressPercent))}%` }} />
          </div>
          <div className={styles.goalInputs}>
            <label className={styles.field}>
              <span>Savings goal</span>
              <select
                value={financePrefs.savingsGoalAmount}
                onChange={(event) => setFinancePrefs((prev) => ({ ...prev, savingsGoalAmount: Number(event.target.value) }))}
              >
                {SAVINGS_GOAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </article>

        <article className={`${styles.insightCard} ${lowBalanceWarning.isCritical ? styles.warningCard : ''}`}>
          <p className={styles.cardLabel}>Low Balance Warning</p>
          <strong className={styles.metricValue}>{formatMoney(entryStats.balance)}</strong>
          <p className={styles.cardNote}>Alert threshold: {formatMoney(lowBalanceWarning.threshold)}</p>
          <div className={styles.goalInputs}>
            <label className={styles.field}>
              <span>Balance alert</span>
              <select
                value={financePrefs.lowBalanceThreshold}
                onChange={(event) => setFinancePrefs((prev) => ({ ...prev, lowBalanceThreshold: Number(event.target.value) }))}
              >
                {LOW_BALANCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          {lowBalanceWarning.warnings.length > 0 ? (
            <ul className={styles.warningList}>
              {lowBalanceWarning.warnings.map((warning) => (
                <li key={warning} className={styles.warningItem}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.cardNote}>Your balance is above the selected warning level.</p>
          )}
        </article>
      </section>

      <section className={styles.academicAlertSection}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.cardLabel}>Academic Calendar Alerts</p>
            <h2 className={styles.sectionTitle}>Tuition and fee deadlines</h2>
          </div>
        </div>

        {tuitionFeeAlerts.length === 0 ? (
          <p className={styles.emptyState}>No tuition or fee deadlines are currently in the alert window.</p>
        ) : (
          <div className={styles.alertList}>
            {tuitionFeeAlerts.map(({ event, alert }) => (
              <article key={event.id} className={styles.alertCard}>
                <div>
                  <p className={styles.alertTitle}>{alert.title}</p>
                  <p className={styles.alertMeta}>
                    Due {alert.dueAt} · Alert started {alert.alertAt}
                  </p>
                  <p className={styles.alertMeta}>
                    {alert.timeRemainingMinutes} minute{alert.timeRemainingMinutes === 1 ? '' : 's'} remaining in this reminder window
                  </p>
                </div>
                <span className={styles.alertPulse}>Tuition</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.layout}>
        <article className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.cardLabel}>{editingEntryId ? 'Edit Entry' : 'New Entry'}</p>
              <h2 className={styles.sectionTitle}>Log student money in seconds</h2>
            </div>
            <div className={styles.toggleGroup}>
              {ENTRY_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.toggleButton} ${entryType === option.value ? styles.toggleButtonActive : ''}`}
                  onClick={() => setEntryType(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g. 25"
              />
            </label>

            <label className={styles.field}>
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {activeCategoryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Date</span>
              <input
                type="date"
                value={entryDate}
                onChange={(event) => setEntryDate(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Note</span>
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note"
              />
            </label>
          </div>

          <div className={styles.chipSection}>
            <p className={styles.chipLabel}>Student-specific categories</p>
            <div className={styles.chipRow}>
              {activeCategoryOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.chip} ${category === option ? styles.chipActive : ''}`}
                  onClick={() => setCategory(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={handleSubmit}>
              {editingEntryId ? 'Save Changes' : 'Add Entry'}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={resetForm}>
              Clear
            </button>
          </div>

          {message && <p className={styles.message}>{message}</p>}
        </article>

        <article className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.cardLabel}>{editingPlanId ? 'Edit Recurring Plan' : 'Recurring Plan'}</p>
              <h2 className={styles.sectionTitle}>Schedule repeating expenses</h2>
            </div>
          </div>

          <div className={styles.presetRow}>
            {RECURRING_PRESETS.map((preset) => (
              <button key={preset.label} type="button" className={styles.presetButton} onClick={() => applyRecurringPreset(preset)}>
                {preset.label}
              </button>
            ))}
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Plan name</span>
              <input
                type="text"
                value={planLabel}
                onChange={(event) => setPlanLabel(event.target.value)}
                placeholder="e.g. Rent, data subscription"
              />
            </label>

            <label className={styles.field}>
              <span>Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={planAmount}
                onChange={(event) => setPlanAmount(event.target.value)}
                placeholder="e.g. 35"
              />
            </label>

            <label className={styles.field}>
              <span>Category</span>
              <select value={planCategory} onChange={(event) => setPlanCategory(event.target.value)}>
                {CATEGORY_OPTIONS.expense.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Frequency</span>
              <select value={planFrequency} onChange={(event) => setPlanFrequency(event.target.value)}>
                {RECURRING_FREQUENCIES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Start date</span>
              <input
                type="date"
                value={planStartDate}
                onChange={(event) => setPlanStartDate(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Note</span>
              <input
                type="text"
                value={planNote}
                onChange={(event) => setPlanNote(event.target.value)}
                placeholder="Optional reminder note"
              />
            </label>

            <label className={styles.field}>
              <span>Reminder</span>
              <select value={planReminderDays} onChange={(event) => setPlanReminderDays(event.target.value)}>
                {REMINDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={handleSaveRecurringPlan}>
              {editingPlanId ? 'Save Plan' : 'Create Plan'}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={resetRecurringForm}>
              Clear Plan
            </button>
          </div>

          <div className={styles.recurringSummaryList}>
            {recurringPlans.length === 0 ? (
              <p className={styles.emptyState}>No recurring expenses added yet.</p>
            ) : (
              recurringPlans.map((plan) => (
                <article key={plan.id} className={styles.recurringPlanCard}>
                  <div>
                    <div className={styles.historyTopRow}>
                      <p className={styles.historyName}>{plan.label}</p>
                      <span className={styles.recurringBadge}>{plan.frequency}</span>
                    </div>
                    <p className={styles.historyNote}>{plan.category} · Next due {plan.nextDueDate} · Remind {plan.reminderDays} day{plan.reminderDays === 1 ? '' : 's'} before</p>
                    <p className={styles.historyDate}>{plan.note || 'No note added'}</p>
                  </div>
                  <div className={styles.historyActions}>
                    <strong>{formatMoney(plan.amount)}</strong>
                    <button type="button" onClick={() => handleEditRecurringPlan(plan)}>Edit</button>
                    <button type="button" onClick={() => handleDeleteRecurringPlan(plan.id)}>Delete</button>
                  </div>
                </article>
              ))
            )}
          </div>

          {dueSoonPlans.length > 0 && (
            <div className={styles.alertList}>
              {dueSoonPlans.map(({ plan, alert }) => (
                <article key={`${plan.id}:${plan.nextDueDate}`} className={styles.alertCard}>
                  <div>
                    <p className={styles.alertTitle}>{plan.label}</p>
                    <p className={styles.alertMeta}>
                      Due {plan.nextDueDate} · {alert.isDueToday ? 'Due today' : `Due in ${alert.dueInDays} day${alert.dueInDays === 1 ? '' : 's'}`}
                    </p>
                    <p className={styles.alertMeta}>{plan.category} · {formatMoney(plan.amount)}</p>
                  </div>
                  <span className={styles.alertPulse}>Alert</span>
                </article>
              ))}
            </div>
          )}

          {recurringSummary.nextDuePlan && (
            <p className={styles.message}>
              Next due: {recurringSummary.nextDuePlan.label} on {recurringSummary.nextDuePlan.nextDueDate}
            </p>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.cardLabel}>Overview</p>
              <h2 className={styles.sectionTitle}>Money patterns this month</h2>
            </div>
            <div className={styles.filterRow}>
              {['all', 'expense', 'income'].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.filterButton} ${filter === value ? styles.filterButtonActive : ''}`}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all' ? 'All' : ENTRY_TYPES[value]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.categoryList}>
            {categoryTotals.length === 0 ? (
              <p className={styles.emptyState}>No entries yet. Add your first income or expense.</p>
            ) : (
              categoryTotals.map((item) => (
                <div key={`${item.kind}:${item.entryCategory}`} className={styles.categoryItem}>
                  <div>
                    <p className={styles.categoryName}>{item.entryCategory}</p>
                    <p className={styles.categoryMeta}>{ENTRY_TYPES[item.kind]}</p>
                  </div>
                  <strong>{formatMoney(item.total)}</strong>
                </div>
              ))
            )}
          </div>

          <p className={styles.historyTitle}>Recent entries</p>
          <div className={styles.historyList}>
            {filteredEntries.length === 0 ? (
              <p className={styles.emptyState}>No entries found for this filter.</p>
            ) : (
              filteredEntries.slice(0, 10).map((entry) => (
                <article key={entry.id} className={styles.historyItem}>
                  <div className={styles.historyMetaGroup}>
                    <div className={styles.historyTopRow}>
                      <p className={styles.historyName}>{entry.category}</p>
                      {entry.source === 'recurring' && <span className={styles.recurringBadge}>Recurring</span>}
                      <span className={`${styles.typeBadge} ${entry.kind === 'income' ? styles.typeBadgeIncome : styles.typeBadgeExpense}`}>
                        {ENTRY_TYPES[entry.kind]}
                      </span>
                    </div>
                    <p className={styles.historyNote}>{entry.note || 'No note added'}</p>
                    <p className={styles.historyDate}>{entry.date}</p>
                  </div>
                  <div className={styles.historyActions}>
                    <strong>{formatMoney(entry.amount)}</strong>
                    <button type="button" onClick={() => handleEdit(entry)}>Edit</button>
                    <button type="button" onClick={() => handleDelete(entry.id)}>Delete</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className={styles.hintStrip}>
        <p className={styles.hintTitle}>Student categories included</p>
        <p className={styles.hintText}>
          Meals, transport, books, stationery, data, accommodation, project costs, exam fees, and campus income like allowance or part-time work.
        </p>
        <div className={styles.hintRow}>
          {STUDENT_SPENDING_HINTS.map((hint) => (
            <span key={hint} className={styles.hintPill}>{hint}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

export default FinanceTracker;
