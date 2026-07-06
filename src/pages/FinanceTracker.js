import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./FinanceTracker.module.css";
import { getAuthToken } from "../utils/authSession";
import { BarChartIcon, NoteIcon, RefreshIcon, GearIcon } from "../utils/icons";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STORAGE_KEY_BASE = "crymson_finance_entries";
const RECURRING_STORAGE_KEY_BASE = "crymson_finance_recurring_plans";
const FINANCE_PREFS_STORAGE_KEY_BASE = "crymson_finance_prefs";
const AUTH_API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

const ENTRY_TYPES = {
  income: "Income",
  expense: "Expense",
};

const ENTRY_TYPE_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

const CATEGORY_OPTIONS = {
  income: [
    "Allowance",
    "Part-time Work",
    "Scholarship",
    "Family Support",
    "Refund",
    "Gift",
    "Side Hustle",
    "Other Income",
  ],
  expense: [
    "Meals",
    "Transport",
    "Books & Notes",
    "Stationery",
    "Data / Internet",
    "Accommodation",
    "Laundry",
    "Exam Fees",
    "Project Materials",
    "Subscriptions",
    "Health",
    "Entertainment",
    "Emergency",
    "Other Expense",
  ],
};

const STUDENT_SPENDING_HINTS = [
  "Meals before class",
  "Transport to campus",
  "Project printing",
  "Airtime and data",
  "Exam registration",
];

const RECURRING_PRESETS = [
  {
    label: "Data subscription",
    category: "Data / Internet",
    amount: "20",
    frequency: "weekly",
    note: "Recurring data bundle",
    reminderDays: 3,
  },
  {
    label: "Transport top-up",
    category: "Transport",
    amount: "35",
    frequency: "weekly",
    note: "Campus commute money",
    reminderDays: 2,
  },
  {
    label: "Rent payment",
    category: "Accommodation",
    amount: "250",
    frequency: "monthly",
    note: "Housing payment reminder",
    reminderDays: 7,
  },
];

const RECURRING_FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const REMINDER_OPTIONS = [
  { value: 1, label: "1 day before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "7 days before" },
];

const SAVINGS_GOAL_OPTIONS = [
  { value: 50, label: "₦50" },
  { value: 100, label: "₦100" },
  { value: 250, label: "₦250" },
  { value: 500, label: "₦500" },
];

const LOW_BALANCE_OPTIONS = [
  { value: 20, label: "₦20" },
  { value: 50, label: "₦50" },
  { value: 100, label: "₦100" },
  { value: 250, label: "₦250" },
];

const RECURRING_INTERVAL_DAYS = {
  weekly: 7,
  monthly: 30,
};

const createEntryId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);

const normalizeKind = (value) => (value === "income" ? "income" : "expense");

const normalizeEntry = (entry) => {
  const kind = normalizeKind(entry?.kind);
  const validCategories = CATEGORY_OPTIONS[kind];
  const category = validCategories.includes(
    String(entry?.category || "").trim(),
  )
    ? String(entry.category).trim()
    : validCategories[0];
  const amount = Number(entry?.amount);

  return {
    id: String(entry?.id || createEntryId()),
    kind,
    category,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    note: String(entry?.note || "").trim(),
    date:
      String(entry?.date || "").slice(0, 10) ||
      new Date().toISOString().slice(0, 10),
    createdAt: String(entry?.createdAt || new Date().toISOString()),
    source: String(entry?.source || ""),
    recurringPlanId: String(entry?.recurringPlanId || ""),
  };
};

const getTodayDateKey = () => new Date().toISOString().slice(0, 10);

const addDaysToDateKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const normalizeRecurringPlan = (plan) => {
  const frequency = RECURRING_FREQUENCIES.some(
    (item) => item.value === plan?.frequency,
  )
    ? plan.frequency
    : "monthly";
  const validCategories = CATEGORY_OPTIONS.expense;
  const category = validCategories.includes(String(plan?.category || "").trim())
    ? String(plan.category).trim()
    : validCategories[0];
  const amount = Number(plan?.amount);
  const startDate =
    String(plan?.startDate || "").slice(0, 10) || getTodayDateKey();
  const reminderDays = REMINDER_OPTIONS.some(
    (item) => item.value === Number(plan?.reminderDays),
  )
    ? Number(plan.reminderDays)
    : 3;

  return {
    id: String(plan?.id || createEntryId()),
    label:
      String(plan?.label || "Recurring expense").trim() || "Recurring expense",
    category,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    frequency,
    note: String(plan?.note || "").trim(),
    startDate,
    nextDueDate: String(plan?.nextDueDate || "").slice(0, 10) || startDate,
    reminderDays,
    active: plan?.active !== false,
  };
};

const createRecurringEntry = (plan, dueDate) =>
  normalizeEntry({
    id: createEntryId(),
    kind: "expense",
    category: plan.category,
    amount: plan.amount,
    note: plan.note || plan.label,
    date: dueDate,
    createdAt: new Date().toISOString(),
    source: "recurring",
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
  const dueInDays = getDaysBetweenDateKeys(
    todayKey,
    plan.nextDueDate || plan.startDate || todayKey,
  );
  if (dueInDays === null) {
    return null;
  }

  const reminderWindow = Number.isFinite(plan.reminderDays)
    ? plan.reminderDays
    : 3;
  if (dueInDays < 0 || dueInDays > reminderWindow) {
    return null;
  }

  return {
    dueInDays,
    isDueToday: dueInDays === 0,
  };
};

const getFinancePrefsKey = (activeUserId) =>
  `${FINANCE_PREFS_STORAGE_KEY_BASE}:${activeUserId || "guest"}`;

const normalizeAcademicEvent = (event) => ({
  id: String(event?.id || ""),
  subject: String(event?.subject || "").trim(),
  title: String(event?.title || "").trim(),
  taskType: String(event?.taskType || "")
    .trim()
    .toLowerCase(),
  dueAt: String(event?.dueAt || ""),
  reminderDelayMinutes: Number(event?.reminderDelayMinutes) || 60,
  acknowledgedAt: String(event?.acknowledgedAt || ""),
  notes: String(event?.notes || "").trim(),
});

const getAcademicDeadlineAlert = (event, now = new Date()) => {
  const dueAtTime = new Date(event.dueAt || "").getTime();
  if (!Number.isFinite(dueAtTime)) {
    return null;
  }

  const reminderDelayMs =
    (Number(event.reminderDelayMinutes) || 60) * 60 * 1000;
  const alertAtTime = dueAtTime - reminderDelayMs;
  const nowTime = now.getTime();
  if (nowTime < alertAtTime || nowTime > dueAtTime) {
    return null;
  }

  const title = `${event.subject || "Academic"}: ${event.title || "Deadline"}`;
  return {
    id: event.id,
    title,
    dueAt: new Date(dueAtTime).toLocaleString(),
    alertAt: new Date(alertAtTime).toLocaleString(),
    timeRemainingMinutes: Math.max(
      0,
      Math.ceil((dueAtTime - nowTime) / (60 * 1000)),
    ),
  };
};

const isTuitionOrFeeEvent = (event) => {
  const combined =
    `${event.subject || ""} ${event.title || ""} ${event.notes || ""}`.toLowerCase();
  return (
    /tuition|fee|fees|payment|registration|school fee|college fee|semester fee/.test(
      combined,
    ) ||
    ["submission-deadline", "exam-timetable"].includes(
      String(event.taskType || "").toLowerCase(),
    )
  );
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
      savingsGoalAmount:
        Number.isFinite(Number(parsed?.savingsGoalAmount)) &&
        Number(parsed.savingsGoalAmount) > 0
          ? Number(parsed.savingsGoalAmount)
          : 100,
      lowBalanceThreshold:
        Number.isFinite(Number(parsed?.lowBalanceThreshold)) &&
        Number(parsed.lowBalanceThreshold) >= 0
          ? Number(parsed.lowBalanceThreshold)
          : 50,
      hideBalanceOnDashboard:
        typeof parsed?.hideBalanceOnDashboard === "boolean"
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

const getStorageKey = (activeUserId) =>
  `${STORAGE_KEY_BASE}:${activeUserId || "guest"}`;
const getRecurringStorageKey = (activeUserId) =>
  `${RECURRING_STORAGE_KEY_BASE}:${activeUserId || "guest"}`;

function FinanceTracker({ activeUserId = "guest" }) {
  const storageKey = useMemo(() => getStorageKey(activeUserId), [activeUserId]);
  const recurringStorageKey = useMemo(
    () => getRecurringStorageKey(activeUserId),
    [activeUserId],
  );
  const financePrefsKey = useMemo(
    () => getFinancePrefsKey(activeUserId),
    [activeUserId],
  );
  const [entries, setEntries] = useState([]);
  const [recurringPlans, setRecurringPlans] = useState([]);
  const [academicEvents, setAcademicEvents] = useState([]);
  const [financePrefs, setFinancePrefs] = useState(() =>
    getFinancePrefs(activeUserId),
  );
  const [entryType, setEntryType] = useState("expense");
  const [category, setCategory] = useState(CATEGORY_OPTIONS.expense[0]);
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [editingEntryId, setEditingEntryId] = useState("");
  const [planLabel, setPlanLabel] = useState("");
  const [planCategory, setPlanCategory] = useState(CATEGORY_OPTIONS.expense[0]);
  const [planAmount, setPlanAmount] = useState("");
  const [planFrequency, setPlanFrequency] = useState("monthly");
  const [planStartDate, setPlanStartDate] = useState(() => getTodayDateKey());
  const [planNote, setPlanNote] = useState("");
  const [planReminderDays, setPlanReminderDays] = useState("3");
  const [editingPlanId, setEditingPlanId] = useState("");
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
      const token = getAuthToken();
      if (!token) {
        hasHydratedRemoteFinanceRef.current = true;
        return;
      }

      try {
        const response = await fetch(
          `${AUTH_API_BASE_URL}/api/user-state/finance`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) {
          return;
        }

        const remoteFinance =
          payload.finance && typeof payload.finance === "object"
            ? payload.finance
            : null;

        if (!remoteFinance) {
          return;
        }

        if (
          Array.isArray(remoteFinance.entries) &&
          remoteFinance.entries.length > 0
        ) {
          setEntries(remoteFinance.entries.map(normalizeEntry));
        }

        if (
          Array.isArray(remoteFinance.recurringPlans) &&
          remoteFinance.recurringPlans.length > 0
        ) {
          setRecurringPlans(
            remoteFinance.recurringPlans.map(normalizeRecurringPlan),
          );
        }

        if (remoteFinance.prefs && typeof remoteFinance.prefs === "object") {
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
    const token = getAuthToken();
    if (!token || !hasHydratedRemoteFinanceRef.current) {
      return undefined;
    }

    if (financeSyncTimeoutRef.current) {
      window.clearTimeout(financeSyncTimeoutRef.current);
    }

    financeSyncTimeoutRef.current = window.setTimeout(async () => {
      try {
        await fetch(`${AUTH_API_BASE_URL}/api/user-state/all`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
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
      const token = getAuthToken();
      if (!token) {
        setAcademicEvents([]);
        return;
      }

      try {
        const response = await fetch(
          `${AUTH_API_BASE_URL}/api/academic-events`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

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
        nextDueDate = addDaysToDateKey(
          nextDueDate,
          RECURRING_INTERVAL_DAYS[plan.frequency] || 30,
        );
      }

      if (newEntries.length > 0) {
        setEntries((prev) => {
          const existingRecurringKeys = new Set(
            prev
              .filter(
                (entry) =>
                  entry.source === "recurring" &&
                  entry.recurringPlanId === plan.id,
              )
              .map((entry) => `${entry.recurringPlanId}:${entry.date}`),
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
    const income = entries.reduce(
      (sum, entry) => sum + (entry.kind === "income" ? entry.amount : 0),
      0,
    );
    const expense = entries.reduce(
      (sum, entry) => sum + (entry.kind === "expense" ? entry.amount : 0),
      0,
    );
    const balance = income - expense;
    const thisMonthPrefix = new Date().toISOString().slice(0, 7);
    const monthEntries = entries.filter((entry) =>
      String(entry.date || "").startsWith(thisMonthPrefix),
    );
    const monthIncome = monthEntries.reduce(
      (sum, entry) => sum + (entry.kind === "income" ? entry.amount : 0),
      0,
    );
    const monthExpense = monthEntries.reduce(
      (sum, entry) => sum + (entry.kind === "expense" ? entry.amount : 0),
      0,
    );

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
      .filter((entry) => filter === "all" || entry.kind === filter)
      .slice()
      .sort(
        (left, right) =>
          new Date(right.date || right.createdAt) -
          new Date(left.date || left.createdAt),
      );
  }, [entries, filter]);

  const categoryTotals = useMemo(() => {
    const totals = entries.reduce((acc, entry) => {
      const key = `${entry.kind}:${entry.category}`;
      acc[key] = (acc[key] || 0) + entry.amount;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([key, total]) => {
        const [kind, entryCategory] = key.split(":");
        return { kind, entryCategory, total };
      })
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);
  }, [entries]);

  const recurringSummary = useMemo(() => {
    const activePlans = recurringPlans.filter((plan) => plan.active);
    const nextDuePlan =
      activePlans
        .slice()
        .sort(
          (left, right) =>
            new Date(left.nextDueDate || left.startDate) -
            new Date(right.nextDueDate || right.startDate),
        )[0] || null;

    const monthlyRecurringTotal = activePlans.reduce((sum, plan) => {
      const multiplier = plan.frequency === "weekly" ? 4 : 1;
      return sum + plan.amount * multiplier;
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
    const monthEntries = entries.filter((entry) =>
      String(entry.date || "").startsWith(currentMonthKey),
    );
    const monthIncome = monthEntries.reduce(
      (sum, entry) => sum + (entry.kind === "income" ? entry.amount : 0),
      0,
    );
    const monthExpense = monthEntries.reduce(
      (sum, entry) => sum + (entry.kind === "expense" ? entry.amount : 0),
      0,
    );
    const monthSavings = Math.max(0, monthIncome - monthExpense);
    const savingsGoalAmount = Number.isFinite(
      Number(financePrefs.savingsGoalAmount),
    )
      ? Number(financePrefs.savingsGoalAmount)
      : 100;
    const progressPercent =
      savingsGoalAmount > 0
        ? Math.min(100, (monthSavings / savingsGoalAmount) * 100)
        : 0;

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
    const lowBalanceThreshold = Number.isFinite(
      Number(financePrefs.lowBalanceThreshold),
    )
      ? Number(financePrefs.lowBalanceThreshold)
      : 50;
    const warnings = [];

    if (entryStats.balance <= lowBalanceThreshold) {
      warnings.push(
        `Your current balance is at ${formatMoney(entryStats.balance)}. Keep at least ${formatMoney(lowBalanceThreshold)} available.`,
      );
    }

    if (monthlySummary.monthExpense > monthlySummary.monthIncome) {
      warnings.push("This month your spending is higher than your income.");
    }

    return {
      threshold: lowBalanceThreshold,
      warnings,
      isCritical: warnings.length > 0,
    };
  }, [
    entryStats.balance,
    financePrefs.lowBalanceThreshold,
    monthlySummary.monthExpense,
    monthlySummary.monthIncome,
  ]);

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
      .sort(
        (left, right) =>
          new Date(left.event.dueAt) - new Date(right.event.dueAt),
      );
  }, [academicEvents]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    recurringSummary.dueSoonPlans.forEach(({ plan, alert }) => {
      const alertKey = `${plan.id}:${plan.nextDueDate}:${plan.reminderDays}:${alert.dueInDays}`;
      if (notifiedReminderKeysRef.current.has(alertKey)) {
        return;
      }

      new Notification("Crymson Finance Reminder", {
        body: `${plan.label} is due ${alert.isDueToday ? "today" : `in ${alert.dueInDays} day${alert.dueInDays === 1 ? "" : "s"}`}.`,
      });
      notifiedReminderKeysRef.current.add(alertKey);
    });
  }, [recurringSummary.dueSoonPlans]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    tuitionFeeAlerts.forEach(({ event, alert }) => {
      const alertKey = `${event.id}:${event.dueAt}:${event.reminderDelayMinutes}`;
      if (notifiedAcademicAlertKeysRef.current.has(alertKey)) {
        return;
      }

      new Notification("Crymson Tuition Reminder", {
        body: `${alert.title} is due in ${alert.timeRemainingMinutes} minute${alert.timeRemainingMinutes === 1 ? "" : "s"}.`,
      });
      notifiedAcademicAlertKeysRef.current.add(alertKey);
    });
  }, [tuitionFeeAlerts]);

  const resetForm = ({ keepMessage = false } = {}) => {
    setAmount("");
    setNote("");
    setEditingEntryId("");
    setEntryType("expense");
    setCategory(CATEGORY_OPTIONS.expense[0]);
    setEntryDate(new Date().toISOString().slice(0, 10));
    if (!keepMessage) {
      setMessage("");
    }
  };

  const handleSubmit = () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("Enter a valid amount greater than zero.");
      return;
    }

    const validCategories = CATEGORY_OPTIONS[entryType];
    const normalizedCategory = validCategories.includes(category)
      ? category
      : validCategories[0];
    const payload = normalizeEntry({
      id: editingEntryId || createEntryId(),
      kind: entryType,
      category: normalizedCategory,
      amount: numericAmount,
      note,
      date: entryDate,
      createdAt: editingEntryId
        ? entries.find((entry) => entry.id === editingEntryId)?.createdAt ||
          new Date().toISOString()
        : new Date().toISOString(),
    });

    setEntries((prev) => {
      if (editingEntryId) {
        return prev.map((entry) =>
          entry.id === editingEntryId ? payload : entry,
        );
      }
      return [payload, ...prev];
    });

    setMessage(
      editingEntryId ? "Entry updated." : `${ENTRY_TYPES[entryType]} logged.`,
    );
    resetForm({ keepMessage: true });
  };

  const handleEdit = (entry) => {
    setEditingEntryId(entry.id);
    setEntryType(entry.kind);
    setCategory(entry.category);
    setAmount(String(entry.amount || ""));
    setEntryDate(entry.date || new Date().toISOString().slice(0, 10));
    setNote(entry.note || "");
    setMessage("Editing an existing entry.");
  };

  const handleDelete = (entryId) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    if (editingEntryId === entryId) {
      resetForm();
    }
  };

  const resetRecurringForm = ({ keepMessage = false } = {}) => {
    setPlanLabel("");
    setPlanCategory(CATEGORY_OPTIONS.expense[0]);
    setPlanAmount("");
    setPlanFrequency("monthly");
    setPlanStartDate(getTodayDateKey());
    setPlanNote("");
    setPlanReminderDays("3");
    setEditingPlanId("");
    if (!keepMessage) {
      setMessage("");
    }
  };

  const handleSaveRecurringPlan = () => {
    const normalizedLabel = String(planLabel || "").trim();
    const numericAmount = Number(planAmount);

    if (!normalizedLabel) {
      setMessage("Add a name for the recurring expense.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("Enter a valid recurring amount greater than zero.");
      return;
    }

    const validCategories = CATEGORY_OPTIONS.expense;
    const normalizedCategory = validCategories.includes(planCategory)
      ? planCategory
      : validCategories[0];
    const normalizedFrequency = RECURRING_FREQUENCIES.some(
      (item) => item.value === planFrequency,
    )
      ? planFrequency
      : "monthly";
    const normalizedReminderDays = REMINDER_OPTIONS.some(
      (item) => item.value === Number(planReminderDays),
    )
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
        ? recurringPlans.find((plan) => plan.id === editingPlanId)
            ?.nextDueDate || planStartDate
        : planStartDate,
      active: true,
    });

    setRecurringPlans((prev) => {
      if (editingPlanId) {
        return prev.map((plan) => (plan.id === editingPlanId ? payload : plan));
      }

      return [payload, ...prev];
    });

    setMessage(
      editingPlanId ? "Recurring expense updated." : "Recurring expense saved.",
    );
    resetRecurringForm({ keepMessage: true });
  };

  const handleEditRecurringPlan = (plan) => {
    setEditingPlanId(plan.id);
    setPlanLabel(plan.label || "");
    setPlanCategory(plan.category || CATEGORY_OPTIONS.expense[0]);
    setPlanAmount(String(plan.amount || ""));
    setPlanFrequency(plan.frequency || "monthly");
    setPlanStartDate(plan.startDate || getTodayDateKey());
    setPlanNote(plan.note || "");
    setPlanReminderDays(String(plan.reminderDays || 3));
    setMessage("Editing a recurring expense.");
  };

  const handleDeleteRecurringPlan = (planId) => {
    setRecurringPlans((prev) => prev.filter((plan) => plan.id !== planId));
    if (editingPlanId === planId) {
      resetRecurringForm();
    }
  };

  const applyRecurringPreset = (preset) => {
    setEntryType("expense");
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
    if (typeof window === "undefined" || !("Notification" in window)) {
      setMessage("Browser alerts are not supported here.");
      return;
    }

    const permission = await Notification.requestPermission();
    setMessage(
      permission === "granted"
        ? "Browser alerts enabled for recurring payments."
        : "Browser alerts were not enabled.",
    );
  };

  // Generate chart data for the past 30 days
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().slice(0, 10);
      const dayEntries = entries.filter((entry) => entry.date === dateKey);
      const income = dayEntries.reduce(
        (sum, e) => sum + (e.kind === "income" ? e.amount : 0),
        0,
      );
      const expense = dayEntries.reduce(
        (sum, e) => sum + (e.kind === "expense" ? e.amount : 0),
        0,
      );

      data.push({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        fullDate: dateKey,
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
      });
    }

    return data;
  }, [entries]);

  // Generate pie chart data for categories
  const pieData = useMemo(() => {
    const categoryBreakdown = entries.reduce((acc, entry) => {
      if (entry.kind === "expense") {
        const key = entry.category;
        acc[key] = (acc[key] || 0) + entry.amount;
      }
      return acc;
    }, {});

    return Object.entries(categoryBreakdown)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);

  const COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#6366f1",
    "#f97316",
  ];

  const [activeNavTab, setActiveNavTab] = useState("dashboard");

  return (
    <div>
      {/* Header */}
      <header className={styles.mainHeader}>
        <div>
          <h1 className={styles.pageTitle}>Finance Tracker</h1>
          <p className={styles.pageSubtitle}>
            Manage your income and expenses efficiently
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className={styles.tabNav}>
        {["dashboard", "entries", "recurring", "settings"].map((tab) => (
          <button
            key={tab}
            className={`${styles.tabItem} ${activeNavTab === tab ? styles.tabActive : ""}`}
            onClick={() => setActiveNavTab(tab)}
          >
            {tab === "dashboard" && <BarChartIcon />} {tab === "entries" && <NoteIcon />}
            {tab === "recurring" && <RefreshIcon />} {tab === "settings" && <GearIcon />}
            <span className={styles.tabLabel}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </span>
          </button>
        ))}
      </nav>

        {/* Dashboard Tab */}
        {activeNavTab === "dashboard" && (
          <div className={styles.dashboardGrid}>
            {/* Top Metrics */}
            <div className={styles.metricsRow}>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Total Balance</p>
                <p className={styles.metricValue}>
                  {formatMoney(entryStats.balance)}
                </p>
                <p className={styles.metricNote}>
                  {entryStats.balance >= 0 ? "âœ“ Positive" : "âš  Overspent"}
                </p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>This Month Income</p>
                <p className={styles.metricValue} style={{ color: "#10b981" }}>
                  {formatMoney(entryStats.monthIncome)}
                </p>
                <p className={styles.metricNote}>
                  {entryStats.transactionCount} transactions
                </p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>This Month Expenses</p>
                <p className={styles.metricValue} style={{ color: "#ef4444" }}>
                  {formatMoney(entryStats.monthExpense)}
                </p>
                <p className={styles.metricNote}>Budget tracking active</p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Monthly Savings</p>
                <p className={styles.metricValue} style={{ color: "#3b82f6" }}>
                  {formatMoney(monthlySummary.monthSavings)}
                </p>
                <p className={styles.metricNote}>
                  Goal: {formatMoney(monthlySummary.savingsGoalAmount)}
                </p>
              </div>
            </div>

            {/* Charts Section */}
            <div className={styles.chartsRow}>
              {/* Bar Chart */}
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>
                  Income vs Expenses (30 Days)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => formatMoney(value)}
                    />
                    <Legend />
                    <Bar
                      dataKey="income"
                      fill="#10b981"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      fill="#ef4444"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Expense Breakdown</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatMoney(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={styles.emptyState}>No expense data yet</p>
                )}
              </div>
            </div>

            {/* Category Breakdown */}
            {pieData.length > 0 && (
              <div className={styles.categoryBreakdownCard}>
                <h3 className={styles.cardTitle}>Category Details</h3>
                <div className={styles.categoryGrid}>
                  {pieData.map((item, index) => (
                    <div key={item.name} className={styles.categoryRow}>
                      <div className={styles.categoryInfo}>
                        <span
                          className={styles.colorDot}
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className={styles.categoryName}>{item.name}</span>
                      </div>
                      <span className={styles.categoryAmount}>
                        {formatMoney(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className={styles.transactionsCard}>
              <h3 className={styles.cardTitle}>Recent Transactions</h3>
              {filteredEntries.length === 0 ? (
                <p className={styles.emptyState}>No transactions yet</p>
              ) : (
                <div className={styles.transactionsList}>
                  {filteredEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className={styles.transactionItem}>
                      <div className={styles.transactionInfo}>
                        <p className={styles.transactionCategory}>
                          {entry.category}
                        </p>
                        <p className={styles.transactionMeta}>{entry.date}</p>
                      </div>
                      <div className={styles.transactionAmountSection}>
                        <span
                          className={`${styles.transactionAmount} ${entry.kind === "income" ? styles.income : styles.expense}`}
                        >
                          {entry.kind === "income" ? "+" : "âˆ’"}
                          {formatMoney(entry.amount)}
                        </span>
                        <button
                          type="button"
                          className={styles.transactionAction}
                          onClick={() => handleEdit(entry)}
                        >
                          âœŽ
                        </button>
                        <button
                          type="button"
                          className={styles.transactionAction}
                          onClick={() => handleDelete(entry.id)}
                        >
                          âœ•
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Entries Tab */}
        {activeNavTab === "entries" && (
          <div className={styles.tabContent}>
            <div className={styles.formCard}>
              <h3 className={styles.cardTitle}>
                {editingEntryId ? "Edit Entry" : "Add New Entry"}
              </h3>

              {message && <p className={styles.message}>{message}</p>}

              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>Type</span>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value)}
                  >
                    {ENTRY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.formField}>
                  <span>Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {activeCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.formField}>
                  <span>Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </label>

                <label className={styles.formField}>
                  <span>Date</span>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </label>

                <label
                  className={styles.formField}
                  style={{ gridColumn: "1 / -1" }}
                >
                  <span>Note</span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note"
                  />
                </label>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSubmit}
                >
                  {editingEntryId ? "Update Entry" : "Add Entry"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={resetForm}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Entries List */}
            <div className={styles.entriesListCard}>
              <div className={styles.entriesHeader}>
                <h3 className={styles.cardTitle}>All Entries</h3>
                <div className={styles.filterButtons}>
                  {["all", "expense", "income"].map((f) => (
                    <button
                      key={f}
                      className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
                      onClick={() => setFilter(f)}
                    >
                      {f === "all" ? "All" : ENTRY_TYPES[f]}
                    </button>
                  ))}
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <p className={styles.emptyState}>No entries found</p>
              ) : (
                <div className={styles.transactionsList}>
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className={styles.transactionItem}>
                      <div className={styles.transactionInfo}>
                        <p className={styles.transactionCategory}>
                          {entry.category}
                        </p>
                        <p className={styles.transactionMeta}>
                          {entry.note || "No note"} â€¢ {entry.date}
                        </p>
                      </div>
                      <div className={styles.transactionAmountSection}>
                        <span
                          className={`${styles.transactionAmount} ${entry.kind === "income" ? styles.income : styles.expense}`}
                        >
                          {entry.kind === "income" ? "+" : "âˆ’"}
                          {formatMoney(entry.amount)}
                        </span>
                        <button
                          type="button"
                          className={styles.transactionAction}
                          onClick={() => handleEdit(entry)}
                        >
                          âœŽ
                        </button>
                        <button
                          type="button"
                          className={styles.transactionAction}
                          onClick={() => handleDelete(entry.id)}
                        >
                          âœ•
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recurring Tab */}
        {activeNavTab === "recurring" && (
          <div className={styles.tabContent}>
            <div className={styles.formCard}>
              <h3 className={styles.cardTitle}>
                {editingPlanId
                  ? "Edit Recurring Plan"
                  : "Create Recurring Plan"}
              </h3>

              {message && <p className={styles.message}>{message}</p>}

              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>Plan Name</span>
                  <input
                    type="text"
                    value={planLabel}
                    onChange={(e) => setPlanLabel(e.target.value)}
                    placeholder="e.g., Rent, Data subscription"
                  />
                </label>

                <label className={styles.formField}>
                  <span>Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={planAmount}
                    onChange={(e) => setPlanAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </label>

                <label className={styles.formField}>
                  <span>Category</span>
                  <select
                    value={planCategory}
                    onChange={(e) => setPlanCategory(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.expense.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.formField}>
                  <span>Frequency</span>
                  <select
                    value={planFrequency}
                    onChange={(e) => setPlanFrequency(e.target.value)}
                  >
                    {RECURRING_FREQUENCIES.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.formField}>
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                  />
                </label>

                <label className={styles.formField}>
                  <span>Reminder (days before)</span>
                  <select
                    value={planReminderDays}
                    onChange={(e) => setPlanReminderDays(e.target.value)}
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  className={styles.formField}
                  style={{ gridColumn: "1 / -1" }}
                >
                  <span>Note</span>
                  <input
                    type="text"
                    value={planNote}
                    onChange={(e) => setPlanNote(e.target.value)}
                    placeholder="Optional reminder note"
                  />
                </label>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSaveRecurringPlan}
                >
                  {editingPlanId ? "Update Plan" : "Create Plan"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={resetRecurringForm}
                >
                  Clear
                </button>
              </div>

              {/* Presets */}
              <div className={styles.presetsSection}>
                <p className={styles.presetsTitle}>Quick Presets</p>
                <div className={styles.presetsGrid}>
                  {RECURRING_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={styles.presetBtn}
                      onClick={() => applyRecurringPreset(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Plans */}
            <div className={styles.plansCard}>
              <h3 className={styles.cardTitle}>Active Plans</h3>
              {recurringPlans.length === 0 ? (
                <p className={styles.emptyState}>No recurring plans yet</p>
              ) : (
                <div className={styles.plansList}>
                  {recurringPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`${styles.planItem} ${!plan.active ? styles.planInactive : ""}`}
                    >
                      <div className={styles.planInfo}>
                        <p className={styles.planName}>{plan.label}</p>
                        <p className={styles.planMeta}>
                          {plan.category} â€¢ {plan.frequency} â€¢ Next:{" "}
                          {plan.nextDueDate}
                        </p>
                        {plan.note && (
                          <p className={styles.planNote}>{plan.note}</p>
                        )}
                      </div>
                      <div className={styles.planActions}>
                        <span className={styles.planAmount}>
                          {formatMoney(plan.amount)}
                        </span>
                        <button
                          type="button"
                          className={styles.transactionAction}
                          onClick={() => handleEditRecurringPlan(plan)}
                        >
                          âœŽ
                        </button>
                        <button
                          type="button"
                          className={styles.transactionAction}
                          onClick={() => handleDeleteRecurringPlan(plan.id)}
                        >
                          âœ•
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Due Soon Alerts */}
            {dueSoonPlans.length > 0 && (
              <div className={styles.alertsCard}>
                <h3 className={styles.cardTitle}>âš ï¸ Due Soon</h3>
                <div className={styles.alertsList}>
                  {dueSoonPlans.map(({ plan, alert }) => (
                    <div
                      key={`${plan.id}:${plan.nextDueDate}`}
                      className={styles.alertItem}
                    >
                      <div className={styles.alertContent}>
                        <p className={styles.alertTitle}>{plan.label}</p>
                        <p className={styles.alertMeta}>
                          {alert.isDueToday
                            ? "ðŸ”´ DUE TODAY"
                            : `Due in ${alert.dueInDays} day${alert.dueInDays === 1 ? "" : "s"}`}
                        </p>
                      </div>
                      <span className={styles.alertAmount}>
                        {formatMoney(plan.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeNavTab === "settings" && (
          <div className={styles.tabContent}>
            <div className={styles.settingsCard}>
              <h3 className={styles.cardTitle}>Financial Preferences</h3>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>
                  <span>Savings Goal (Monthly)</span>
                  <select
                    value={financePrefs.savingsGoalAmount}
                    onChange={(e) =>
                      setFinancePrefs((prev) => ({
                        ...prev,
                        savingsGoalAmount: Number(e.target.value),
                      }))
                    }
                  >
                    {SAVINGS_GOAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>
                  <span>Low Balance Alert Threshold</span>
                  <select
                    value={financePrefs.lowBalanceThreshold}
                    onChange={(e) =>
                      setFinancePrefs((prev) => ({
                        ...prev,
                        lowBalanceThreshold: Number(e.target.value),
                      }))
                    }
                  >
                    {LOW_BALANCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.settingGroup}>
                <p className={styles.settingInfo}>
                  Current Balance:{" "}
                  <strong>{formatMoney(entryStats.balance)}</strong>
                </p>
                <p className={styles.settingInfo}>
                  Monthly Savings:{" "}
                  <strong>{formatMoney(monthlySummary.monthSavings)}</strong>
                </p>
                <p className={styles.settingInfo}>
                  Monthly Expenses:{" "}
                  <strong>{formatMoney(entryStats.monthExpense)}</strong>
                </p>
              </div>

              {lowBalanceWarning.isCritical && (
                <div className={styles.warningBox}>
                  <p className={styles.warningTitle}>âš ï¸ Financial Alert</p>
                  {lowBalanceWarning.warnings.map((warning, idx) => (
                    <p key={idx} className={styles.warningText}>
                      {warning}
                    </p>
                  ))}
                </div>
              )}

              <div className={styles.settingGroup}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleEnableBrowserAlerts}
                >
                  Enable Browser Notifications
                </button>
              </div>
            </div>

            {/* Category Guide */}
            <div className={styles.guideCard}>
              <h3 className={styles.cardTitle}>Student Category Guide</h3>
              <p className={styles.guideText}>
                Our categories are designed for student life. Track everything
                from meals and transport to exam fees and campus income.
              </p>
              <div className={styles.tagsGrid}>
                {STUDENT_SPENDING_HINTS.map((hint) => (
                  <span key={hint} className={styles.tag}>
                    {hint}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default FinanceTracker;
