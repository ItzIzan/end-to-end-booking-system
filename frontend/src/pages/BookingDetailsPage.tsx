import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getBooking, getBookingAudit } from "../api/bookingsApi";
import { useAuth } from "../auth/AuthContext";
import type { AuditLog, Booking } from "../types";

export default function BookingDetailsPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !currentUser) return;

    Promise.all([getBooking(id, currentUser), getBookingAudit(id, currentUser)])
      .then(([bookingData, auditData]) => {
        setBooking(bookingData);
        setAuditLogs(auditData);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load booking")
      );
  }, [id, currentUser]);

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!booking) {
    return <p>Loading booking...</p>;
  }

  return (
    <div className="details-grid">
      <section className="card">
        <h2>Booking #{booking.id}</h2>
        <p><strong>Reg:</strong> {booking.reg}</p>
        <p><strong>Vehicle:</strong> {booking.make} {booking.model}</p>
        <p><strong>Colour:</strong> {booking.colour}</p>
        <p><strong>Customer:</strong> {booking.customerName}</p>
        <p><strong>Status:</strong> {booking.status}</p>
        <p><strong>Driver:</strong> {booking.assignedDriverName || "-"}</p>
        <p><strong>Driver delivered:</strong> {booking.driverDelivered ? "Yes" : "No"}</p>
        <p><strong>End user delivered:</strong> {booking.endUserDelivered ? "Yes" : "No"}</p>
      </section>

      <section className="card">
        <h2>Audit Trail</h2>

        {auditLogs.length === 0 && <p>No audit history yet.</p>}

        <div className="audit-list">
          {auditLogs.map((log) => (
            <div className="audit-item" key={log.id}>
              <strong>{log.action}</strong>
              <p>
                {log.fieldName && (
                  <>
                    {log.fieldName}: {log.previousValue || "empty"} →{" "}
                    {log.newValue || "empty"}
                  </>
                )}
              </p>
              <small>
                {log.changedByName || "Unknown user"} · {log.changedByRole || "No role"} ·{" "}
                {new Date(log.createdAt).toLocaleString()}
              </small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}