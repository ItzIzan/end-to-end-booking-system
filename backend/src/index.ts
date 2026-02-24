import express from "express";
import healthRoutes from "./routes/health.routes";
import bookingRoutes from "./routes/bookings.routes";

const app = express();

app.use(express.json());

app.use("/health", healthRoutes);
app.use("/bookings", bookingRoutes);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});