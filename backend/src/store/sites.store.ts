const { prisma } = require("../lib/prisma");
import type { CreateSiteInput, Site } from "../types/site";

export const sitesStore = {
  async getAll(): Promise<Site[]> {
    return prisma.site.findMany({
      orderBy: {
        name: "asc",
      },
    });
  },

  async getById(id: number): Promise<Site | null> {
    return prisma.site.findUnique({
      where: { id },
    });
  },

  async create(data: CreateSiteInput): Promise<Site> {
    return prisma.site.create({
      data,
    });
  },

  async updateById(
    id: number,
    updates: Partial<Pick<Site, "name" | "address" | "isActive">>
  ): Promise<Site | null> {
    const existing = await prisma.site.findUnique({
      where: { id },
    });

    if (!existing) return null;

    return prisma.site.update({
      where: { id },
      data: updates,
    });
  },
};