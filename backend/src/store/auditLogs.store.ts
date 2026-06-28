const { prisma } = require("../lib/prisma");
import type {
  AuditEntityType,
  AuditLog,
  CreateAuditLogInput,
} from "../types/auditLog";

export const auditLogsStore = {
  async getByEntity(
    entityType: AuditEntityType,
    entityId: number
  ): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
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