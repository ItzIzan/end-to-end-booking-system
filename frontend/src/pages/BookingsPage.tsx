import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBookings } from "../api/bookingsApi";
import { useAuth } from "../auth/AuthContext";
import type { Booking } from "../types";

export default function BookingsPage() {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    getBookings(currentUser)
      .then(setBookings)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load bookings")
      );
  }, [currentUser]);

  return (
    <div className="card">
      <h2>Bookings</h2>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Reg</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Driver</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>{booking.id}</td>
              <td>{booking.reg}</td>
              <td>{booking.customerName}</td>
              <td>{booking.status}</td>
              <td>{booking.assignedDriverName || "-"}</td>
              <td>
                <Link to={`/bookings/${booking.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}