import { useAuth } from "../auth/AuthContext";

export default function DashboardPage() {
  const { currentUser } = useAuth();

  return (
    <div className="card">
      <h2>Dashboard</h2>
      <p>
        Logged in as <strong>{currentUser?.name}</strong>
      </p>
      <p>Role: {currentUser?.role}</p>
    </div>
  );
}