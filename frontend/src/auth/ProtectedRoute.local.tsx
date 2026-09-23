import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { canAccess, getDefaultRoute } from "./roleAccess";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading, error } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p>Loading user...</p>;
  }

  if (error || !currentUser) {
    return (
      <div className="card">
        <h2>No user loaded</h2>
        <p>{error || "Could not load current user."}</p>
        <p>Create users in the backend first, then set the user ID in the top bar.</p>
      </div>
    );
  }

  if (!canAccess(location.pathname, currentUser.role)) {
    return <Navigate to={getDefaultRoute(currentUser.role)} replace />;
  }

  return <>{children}</>;
}