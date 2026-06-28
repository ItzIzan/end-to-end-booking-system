import express from "express";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import bookingRoutes from "./routes/bookings.routes";
import userRoutes from "./routes/users.routes";
import siteRoutes from "./routes/sites.routes";
import vehicleRoutes from "./routes/vehicles.routes";
import bookingSettingsRoutes from "./routes/bookingSettings.routes";

const app = express();

app.use(express.json());

app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/sites", siteRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/bookings", bookingRoutes);
app.use("/booking-settings", bookingSettingsRoutes);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});