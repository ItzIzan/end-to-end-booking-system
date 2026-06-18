import { useEffect, useState } from "react";
import { getUsers } from "../api/usersApi";
import { useAuth } from "../auth/AuthContext";
import type { User } from "../types";

export default function UsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    getUsers(currentUser).then(setUsers);
  }, [currentUser]);

  return (
    <div className="card">
      <h2>Users</h2>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}