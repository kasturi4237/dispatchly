import { useAuth } from "./hooks/useAuth";
import { Spinner } from "./components/Spinner";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

export default function App() {
  const { user, checking, logout } = useAuth();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Spinner label="Checking your session..." />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <DashboardPage user={user} onLogout={logout} />;
}
