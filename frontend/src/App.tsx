import { Routes, Route, Navigate } from 'react-router-dom'
import { getToken } from './lib/api'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import WorkoutPage from './pages/WorkoutPage'
import NutritionPage from './pages/NutritionPage'
import AromiPage from './pages/AromiPage'
import ProgressPage from './pages/ProgressPage'
import AgentEventsPage from './pages/AgentEventsPage'
import SettingsPage from './pages/SettingsPage'
import HistoryPage from './pages/HistoryPage'
import GroceryPage from './pages/GroceryPage'
import WorkoutTimerPage from './pages/WorkoutTimerPage'
import ChallengesPage from './pages/ChallengesPage'
import PhotoTimelinePage from './pages/PhotoTimelinePage'
import WeeklyReportPage from './pages/WeeklyReportPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Layout>
              <Routes>
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/" element={<DashboardPage />} />
                <Route path="/workout" element={<WorkoutPage />} />
                <Route path="/nutrition" element={<NutritionPage />} />
                <Route path="/aromi" element={<AromiPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/agent-events" element={<AgentEventsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/grocery" element={<GroceryPage />} />
                <Route path="/workout/timer" element={<WorkoutTimerPage />} />
                <Route path="/challenges" element={<ChallengesPage />} />
                <Route path="/timeline" element={<PhotoTimelinePage />} />
                <Route path="/reports/weekly" element={<WeeklyReportPage />} />
              </Routes>
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
