import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";
import GoogleLoginButton from "./auth/GoogleLoginButton";
import Layout from "./components/Layout";
import SearchPage from "./pages/SearchPage";
import HistoryPage from "./pages/HistoryPage";
import RunDetailPage from "./pages/RunDetailPage";

function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/search" replace />;
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Pulse</h1>
        <p className="text-gray-500 text-sm">Trend research for the team</p>
        <GoogleLoginButton />
        <p className="text-xs text-gray-400">Sign in with your company account</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/search" element={<SearchPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/run/:id" element={<RunDetailPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
