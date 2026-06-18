import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { canAccess } from "../auth/roleAccess";

const navItems = [
  { path: "/", label: "Dashboard" },
  { path: "/bookings", label: "Bookings" },
  { path: "/ops", label: "Ops" },
  { path: "/security", label: "Security" },
  { path: "/driver", label: "Driver" },
  { path: "/customer", label: "Customer" },
  { path: "/users", label: "Users" },
];

export default function Layout() {
  const { currentUser, userId, switchUser } = useAuth();

  return (
    <div>
      <header className="topbar">
        <h1>End-to-End Booking System</h1>

        <div className="user-switcher">
          <label>
            User ID
            <input
              value={userId}
              onChange={(event) => switchUser(event.target.value)}
            />
          </label>

          {currentUser && (
            <div>
              <strong>{currentUser.name}</strong>
              <span>{currentUser.role}</span>
            </div>
          )}
        </div>
      </header>

      <nav className="nav">
        {currentUser &&
          navItems
            .filter((item) => canAccess(item.path, currentUser.role))
            .map((item) => (
              <Link key={item.path} to={item.path}>
                {item.label}
              </Link>
            ))}
      </nav>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}