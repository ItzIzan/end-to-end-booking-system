const { prisma } = require("../lib/prisma");
import type { User, UserRole } from "../types/user";

export const usersStore = {
  async getAll(): Promise<User[]> {
    return prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async create(data: {
    name: string;
    email: string;
    role: UserRole;
  }): Promise<User> {
    return prisma.user.create({
      data,
    });
  },
};