const { prisma } = require("../lib/prisma");
import type { AuditLog, CreateAuditLogInput } from "../types/auditLog";

export const auditLogsStore = {
  async getByBookingId(bookingId: number): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: {
        bookingId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async create(data: CreateAuditLogInput): Promise<AuditLog> {
    return prisma.auditLog.create({
      data,
    });
  },
};