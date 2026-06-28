import { Request, Response } from "express";
import { auditLogsStore } from "../store/auditLogs.store";
import { sitesStore } from "../store/sites.store";
import { getRoleFromHeader } from "../utils/bookingPermissions";

function getActor(req: Request) {
  const userIdHeader = req.header("x-user-id");
  const userId = userIdHeader ? Number(userIdHeader) : null;

  return {
    changedByUserId: userId && !Number.isNaN(userId) ? userId : null,
    changedByRole: getRoleFromHeader(req.header("x-user-role")),
    changedByName: req.header("x-user-name") || null,
  };
}

export const getSites = async (_req: Request, res: Response) => {
  const sites = await sitesStore.getAll();
  return res.json(sites);
};

export const getSiteById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid site id" });
  }

  const site = await sitesStore.getById(id);

  if (!site) {
    return res.status(404).json({ error: "Site not found" });
  }

  return res.json(site);
};

export const createSite = async (req: Request, res: Response) => {
  const { name, address } = req.body as {
    name?: string;
    address?: string;
  };

  if (!name || !address) {
    return res.status(400).json({
      error: "name and address are required",
    });
  }

  const site = await sitesStore.create({
    name,
    address,
  });

  await auditLogsStore.create({
    entityType: "SITE",
    entityId: site.id,
    action: "SITE_CREATED",
    fieldName: "name",
    previousValue: null,
    newValue: site.name,
    ...getActor(req),
  });

  return res.status(201).json(site);
};

export const updateSite = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid site id" });
  }

  const existing = await sitesStore.getById(id);

  if (!existing) {
    return res.status(404).json({ error: "Site not found" });
  }

  const { name, address, isActive } = req.body;

  const updated = await sitesStore.updateById(id, {
    name,
    address,
    isActive,
  });

  await auditLogsStore.create({
    entityType: "SITE",
    entityId: id,
    action: "SITE_UPDATED",
    fieldName: null,
    previousValue: JSON.stringify(existing),
    newValue: JSON.stringify(updated),
    ...getActor(req),
  });

  return res.json(updated);
};