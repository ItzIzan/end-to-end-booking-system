const { prisma } = require("../lib/prisma");

import type {
  CreateCustomerAccountInput,
  CustomerAccount,
} from "../types/customerAccount";

export const customerAccountsStore = {
  async getAll(): Promise<CustomerAccount[]> {
    return prisma.customerAccount.findMany({
      orderBy: {
        companyName: "asc",
      },
    });
  },

  async getById(id: number): Promise<CustomerAccount | null> {
    return prisma.customerAccount.findUnique({
      where: { id },
    });
  },

  async create(
    data: CreateCustomerAccountInput
  ): Promise<CustomerAccount> {
    return prisma.customerAccount.create({
      data,
    });
  },

  async updateById(
    id: number,
    updates: Partial<CreateCustomerAccountInput> & {
      isActive?: boolean;
    }
  ): Promise<CustomerAccount | null> {
    const existing = await prisma.customerAccount.findUnique({
      where: { id },
    });

    if (!existing) return null;

    return prisma.customerAccount.update({
      where: { id },
      data: updates,
    });
  },
};