import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "../types";
import { getCurrentUser } from "../api/usersApi";

interface AuthContextValue {
  currentUser: User | null;
  userId: string;
  loading: boolean;
  error: string | null;
  switchUser: (nextUserId: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState(() => {
    return localStorage.getItem("currentUserId") || "1";
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshUser() {
    try {
      setLoading(true);
      setError(null);
      const user = await getCurrentUser(userId);
      setCurrentUser(user);
    } catch (err) {
      setCurrentUser(null);
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  function switchUser(nextUserId: string) {
    localStorage.setItem("currentUserId", nextUserId);
    setUserId(nextUserId);
  }

  useEffect(() => {
    refreshUser();
  }, [userId]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userId,
        loading,
        error,
        switchUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}