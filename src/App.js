import React, { useEffect, useState } from "react";
import WelcomeScreen from "./screens/WelcomeScreen.jsx";
import GradeTrackerScreen from "./screens/GradeTrackerScreen";
import TaskPlannerScreen from "./screens/TaskPlannerScreen";
import HomeScreen from "./screens/HomeScreen";
import MyGradeTrackerScreen from "./screens/MyGradeTrackerScreen";
import TimeTrackerScreen from "./screens/TimeTrackerScreen";
import FinanceTrackerScreen from "./screens/FinanceTrackerScreen";
import Admin from "./pages/Admin";
import AppLayout from "./components/AppLayout";
import DetectionPrompt from "./components/DetectionPrompt";
import PermissionsPanel from "./components/PermissionsPanel";
import TextCaptureWidget from "./components/TextCaptureWidget";
import { DetectionProvider } from "./hooks/useTextDetection";
import ShareTarget from "./pages/ShareTarget";
import CourseMaterials from "./pages/CourseMaterials";
import StudyPlanner from "./pages/StudyPlanner";
import WellbeingScreen from "./screens/WellbeingScreen";
import CrymsonScoreScreen from "./screens/CrymsonScoreScreen";
import SemesterWrappedScreen from "./screens/SemesterWrappedScreen";
import SocialScreen from "./screens/SocialScreen";
import { TimerProvider } from "./context/TimerContext";
import {
  clearAuthSession,
  getAuthToken,
  setAuthToken,
} from "./utils/authSession";

const AUTH_API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;
const APP_STATE_KEY = "crymson_app_state";
const ALLOWED_PAGES = new Set([
  "landing",
  "home",
  "cgpa",
  "user-cgpa",
  "todo",
  "time",
  "finance",
  "admin",
  "share-target",
  "course-materials",
  "study-planner",
  "wellbeing",
  "crymson-score",
  "semester-wrapped",
  "social",
]);

const getSavedAppState = () => {
  try {
    const raw = localStorage.getItem(APP_STATE_KEY);
    if (!raw) {
      return { currentPage: "landing", activeUserId: "", activeUserName: "" };
    }

    const parsed = JSON.parse(raw);
    const page =
      typeof parsed.currentPage === "string" &&
      ALLOWED_PAGES.has(parsed.currentPage)
        ? parsed.currentPage
        : "landing";
    const userId =
      typeof parsed.activeUserId === "string" ? parsed.activeUserId : "";
    const userName =
      typeof parsed.activeUserName === "string" ? parsed.activeUserName : "";

    return {
      currentPage: page,
      activeUserId: userId,
      activeUserName: userName,
    };
  } catch (error) {
    return { currentPage: "landing", activeUserId: "", activeUserName: "" };
  }
};

const clearSessionStorage = () => {
  localStorage.removeItem(APP_STATE_KEY);
  clearAuthSession();
};

const THEME_KEY = "crymson_theme";

const getSavedTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState("landing");
  const [activeUserId, setActiveUserId] = useState("");
  const [activeUserName, setActiveUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionNotice, setSessionNotice] = useState("");
  const [theme, setTheme] = useState(getSavedTheme);

  const darkMode = theme === "dark";

  const handleToggleDark = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      return next;
    });
  };

  useEffect(() => {
    let isCancelled = false;

    const restoreFromValidSession = async () => {
      const token = getAuthToken();
      const savedState = getSavedAppState();

      if (!token) {
        if (savedState.currentPage !== "landing") {
          setSessionNotice(
            "This tab does not share the signed-in session. Please sign in again to continue.",
          );
        }
        clearSessionStorage();
        return;
      }

      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/session`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.message || "Invalid session.");
        }

        if (isCancelled) {
          return;
        }

        const restoredUserId =
          payload?.user?.crymsonId || savedState.activeUserId;
        const restoredUserName =
          payload?.user?.fullName || savedState.activeUserName;
        const restoredPage =
          savedState.currentPage && savedState.currentPage !== "landing"
            ? savedState.currentPage
            : payload?.user?.isAdmin
              ? "admin"
              : "home";

        if (!restoredUserId) {
          throw new Error("Invalid session user.");
        }

        setActiveUserId(restoredUserId);
        setActiveUserName(restoredUserName);
        setIsAdmin(Boolean(payload?.user?.isAdmin));
        setSessionNotice("");
        setCurrentPage(
          Boolean(payload?.user?.isAdmin) && restoredPage === "home"
            ? "admin"
            : restoredPage,
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        clearSessionStorage();
        setActiveUserId("");
        setActiveUserName("");
        setIsAdmin(false);
        setSessionNotice(
          "Your session expired. Please sign in again to continue.",
        );
        setCurrentPage("landing");
      }
    };

    restoreFromValidSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      APP_STATE_KEY,
      JSON.stringify({ currentPage, activeUserId, activeUserName }),
    );
  }, [currentPage, activeUserId, activeUserName]);

  const navigateToCGPA = () => {
    setCurrentPage("cgpa");
  };

  const navigateToUserCGPA = () => {
    setCurrentPage("user-cgpa");
  };

  const navigateToTodo = () => {
    setCurrentPage("todo");
  };

  const navigateToTimeTracker = () => {
    setCurrentPage("time");
  };

  const navigateToFinanceTracker = () => {
    setCurrentPage("finance");
  };

  const navigateToAdmin = () => {
    setCurrentPage("admin");
  };

  const navigateToUserHome = (userId, userName, token, adminFlag = false) => {
    if (typeof token === "string" && token) {
      setAuthToken(token);
    }

    setActiveUserId(userId);
    setActiveUserName(userName || "");
    setIsAdmin(Boolean(adminFlag));
    setSessionNotice("");
    setCurrentPage(Boolean(adminFlag) ? "admin" : "home");
  };

  const navigateHome = () => {
    setCurrentPage("landing");
  };

  const [activeCourseCode, setActiveCourseCode] = useState("");

  const navigateToShareTarget = () => {
    setCurrentPage("share-target");
  };

  const navigateToCourseMaterials = (courseCode) => {
    setActiveCourseCode(courseCode || "");
    setCurrentPage("course-materials");
  };

  const navigateToStudyPlanner = () => {
    setCurrentPage("study-planner");
  };

  const shouldShowShareTarget = currentPage === "share-target";
  const shouldShowCourseMaterials = currentPage === "course-materials";

  const handleLogout = () => {
    clearSessionStorage();
    setActiveUserId("");
    setActiveUserName("");
    setSessionNotice("");
    setCurrentPage("landing");
  };

  return (
    <TimerProvider>
      <DetectionProvider>
        <div className={`App financeTheme page-${currentPage}`} data-theme={theme}>
          {currentPage === "landing" && (
            <WelcomeScreen
              onNavigateToCGPA={navigateToCGPA}
              onNavigateToTodo={navigateToTodo}
              onNavigateToTime={navigateToTimeTracker}
              onNavigateToFinance={navigateToFinanceTracker}
              onLoginSuccess={navigateToUserHome}
              isAdmin={isAdmin}
              sessionNotice={sessionNotice}
            />
          )}

          {shouldShowShareTarget && (
            <ShareTarget />
          )}

          {shouldShowCourseMaterials && (
            <CourseMaterials
              courseCode={activeCourseCode}
              onBack={() => setCurrentPage("home")}
            />
          )}

          {currentPage !== "landing" && !shouldShowShareTarget && !shouldShowCourseMaterials && (
            <AppLayout
              activePage={currentPage}
              userId={activeUserId}
              userName={activeUserName}
              isAdmin={isAdmin}
              onNavigate={(page) => {
                if (page !== "course-materials") setActiveCourseCode("");
                setCurrentPage(page);
              }}
              onLogout={handleLogout}
              darkMode={darkMode}
              onToggleDark={handleToggleDark}
            >
              {currentPage === "home" && (
                <HomeScreen
                  userId={activeUserId}
                  userName={activeUserName}
                  onNavigateToUserCGPA={navigateToUserCGPA}
                  onNavigateToTodo={navigateToTodo}
                  onNavigateToTime={navigateToTimeTracker}
                  onNavigateToFinance={navigateToFinanceTracker}
                  onNavigateToAdmin={navigateToAdmin}
                  isAdmin={isAdmin}
                />
              )}

              {currentPage === "cgpa" && (
                <GradeTrackerScreen />
              )}

              {currentPage === "user-cgpa" && (
                <MyGradeTrackerScreen
                  activeUserId={activeUserId}
                  onNavigateToCourseMaterials={navigateToCourseMaterials}
                />
              )}

              {currentPage === "todo" && (
                <TaskPlannerScreen
                  activeUserId={activeUserId}
                />
              )}

              {currentPage === "time" && (
                <TimeTrackerScreen
                  activeUserId={activeUserId}
                />
              )}

              {currentPage === "finance" && (
                <FinanceTrackerScreen
                  activeUserId={activeUserId}
                />
              )}

              {currentPage === "admin" && (
                <Admin
                  userId={activeUserId}
                  userName={activeUserName}
                  isAdmin={true}
                />
              )}

              {currentPage === "study-planner" && (
                <StudyPlanner activeUserId={activeUserId} />
              )}

              {currentPage === "wellbeing" && (
                <WellbeingScreen />
              )}

              {currentPage === "crymson-score" && (
                <CrymsonScoreScreen activeUserId={activeUserId} />
              )}

              {currentPage === "semester-wrapped" && (
                <SemesterWrappedScreen activeUserId={activeUserId} />
              )}

              {currentPage === "social" && (
                <SocialScreen activeUserId={activeUserId} />
              )}
            </AppLayout>
          )}

          <DetectionPrompt />
          <PermissionsPanel />
          <TextCaptureWidget />
        </div>
      </DetectionProvider>
    </TimerProvider>
  );
}

export default App;
