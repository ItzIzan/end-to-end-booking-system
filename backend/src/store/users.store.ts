const { prisma } = require("../lib/prisma");
import type { RegisterUserInput, User, UserWithPassword } from "../types/user";

const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export const usersStore = {
  async getAll(): Promise<User[]> {
    return prisma.user.findMany({
      select: publicUserSelect,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  },

  async getByIdWithPassword(id: number): Promise<UserWithPassword | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async findByEmailOrUsername(
    emailOrUsername: string
  ): Promise<UserWithPassword | null> {
    return prisma.user.findFirst({
      where: {
        OR: [
          {
            email: {
              equals: emailOrUsername,
              mode: "insensitive",
            },
          },
          {
            username: {
              equals: emailOrUsername,
              mode: "insensitive",
            },
          },
        ],
      },
    });
  },

  async create(data: RegisterUserInput): Promise<User> {
    return prisma.user.create({
      data,
      select: publicUserSelect,
    });
  },
};