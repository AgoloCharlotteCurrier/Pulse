import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLink = (to: string, label: string) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`px-3 py-2 rounded text-sm font-medium ${
          active ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-800">
        <div className="mx-auto max-w-5xl px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <span className="text-white font-bold text-lg">Pulse</span>
            {navLink("/search", "Search")}
            {navLink("/history", "History")}
          </div>
          <div className="flex items-center gap-3">
            {user?.picture && (
              <img src={user.picture} className="h-8 w-8 rounded-full" alt="" referrerPolicy="no-referrer" />
            )}
            <span className="text-gray-300 text-sm">{user?.name}</span>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
