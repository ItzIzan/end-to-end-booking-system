import fs from "fs";
import path from "path";

import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  EVIDENCE_ROOT,
} from "../config/uploadPaths";

import {
  MIN_EVIDENCE_IMAGES,
} from "../constants/bookingEvidence";

import {
  auditLogsStore,
} from "../store/auditLogs.store";

import {
  bookingEvidenceStore,
} from "../store/bookingEvidence.store";

import {
  bookingsStore,
} from "../store/bookings.store";

import {
  usersStore,
} from "../store/users.store";

import type {
  Booking,
} from "../types/booking";

import type {
  BookingEvidenceType,
} from "../types/bookingEvidence";

import type {
  User,
} from "../types/user";

async function getRequestUser(
  req: Request,
  res: Response
): Promise<
  User | null
> {
  const header =
    req.header(
      "x-user-id"
    );

  if (!header) {
    res.status(401).json({
      error:
        "Missing x-user-id header",
    });

    return null;
  }

  const userId =
    Number(header);

  if (
    Number.isNaN(
      userId
    )
  ) {
    res.status(400).json({
      error:
        "x-user-id must be a number",
    });

    return null;
  }

  const user =
    await usersStore.getById(
      userId
    );

  if (
    !user ||
    !user.isActive
  ) {
    res.status(401).json({
      error:
        "User does not exist or is inactive",
    });

    return null;
  }

  return user;
}

function parseBookingId(
  req: Request
): number | null {
  const id =
    Number(
      req.params.id
    );

  return Number.isNaN(
    id
  )
    ? null
    : id;
}

function evidenceResponse(
  record: any
) {
  return {
    ...record,

    url:
      `/uploads/evidence/${record.storageKey}`,
  };
}

function canViewEvidence(
  user: User,
  booking: Booking
): boolean {
  if (
    user.role ===
    "CUSTOMER"
  ) {
    return (
      user.customerAccountId ===
      booking.customerAccountId
    );
  }

  if (
    user.role ===
    "DRIVER"
  ) {
    return (
      booking.assignedDriverId ===
      user.id
    );
  }

  return [
    "SYSTEM_ADMIN",
    "TRANSPORT_ADMIN",
    "OPS_ADMIN",
    "SECURITY",
  ].includes(
    user.role
  );
}

async function validateUploadPreflight(
  req: Request,
  res: Response,
  type:
    BookingEvidenceType
): Promise<boolean> {
  const bookingId =
    parseBookingId(
      req
    );

  if (
    bookingId === null
  ) {
    res.status(400).json({
      error:
        "Invalid booking id",
    });

    return false;
  }

  const user =
    await getRequestUser(
      req,
      res
    );

  if (!user) {
    return false;
  }

  if (
    user.role !==
    "DRIVER"
  ) {
    res.status(403).json({
      error:
        "Only drivers can upload booking evidence",
    });

    return false;
  }

  const booking =
    await bookingsStore.getById(
      bookingId
    );

  if (!booking) {
    res.status(404).json({
      error:
        "Booking not found",
    });

    return false;
  }

  if (
    booking.assignedDriverId !==
    user.id
  ) {
    res.status(403).json({
      error:
        "Only the assigned driver can upload evidence",
    });

    return false;
  }

  if (
    type === "POC"
  ) {
    if (
      booking.status !==
      "READY_TO_COLLECT"
    ) {
      res.status(400).json({
        error:
          "POC can only be uploaded while the vehicle is READY_TO_COLLECT",
      });

      return false;
    }

    if (
      booking.driverCollectedAt
    ) {
      res.status(400).json({
        error:
          "POC cannot be changed after collection has been confirmed",
      });

      return false;
    }
  }

  if (
    type === "POD"
  ) {
    if (
      booking.status !==
      "IN_TRANSIT"
    ) {
      res.status(400).json({
        error:
          "POD can only be uploaded while the vehicle is IN_TRANSIT",
      });

      return false;
    }

    if (
      booking.driverDeliveredAt
    ) {
      res.status(400).json({
        error:
          "POD cannot be changed after delivery has been confirmed",
      });

      return false;
    }
  }

  res.locals.evidenceUser =
    user;

  res.locals.evidenceBooking =
    booking;

  return true;
}

export const preflightPocEvidence =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (
      await validateUploadPreflight(
        req,
        res,
        "POC"
      )
    ) {
      next();
    }
  };

export const preflightPodEvidence =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (
      await validateUploadPreflight(
        req,
        res,
        "POD"
      )
    ) {
      next();
    }
  };

export const getBookingEvidence =
  async (
    req: Request,
    res: Response
  ) => {
    const bookingId =
      parseBookingId(
        req
      );

    if (
      bookingId === null
    ) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const user =
      await getRequestUser(
        req,
        res
      );

    if (!user) {
      return;
    }

    const booking =
      await bookingsStore.getById(
        bookingId
      );

    if (!booking) {
      return res.status(404).json({
        error:
          "Booking not found",
      });
    }

    if (
      !canViewEvidence(
        user,
        booking
      )
    ) {
      return res.status(403).json({
        error:
          "You do not have permission to view this evidence",
      });
    }

    const evidence =
      await bookingEvidenceStore
        .getByBookingId(
          bookingId
        );

    const pocCount =
      evidence.filter(
        item =>
          item.type ===
          "POC"
      ).length;

    const podCount =
      evidence.filter(
        item =>
          item.type ===
          "POD"
      ).length;

    return res.json({
      evidence:
        evidence.map(
          evidenceResponse
        ),

      counts: {
        POC:
          pocCount,

        POD:
          podCount,
      },

      minimumRequired:
        MIN_EVIDENCE_IMAGES,
    });
  };

async function uploadEvidence(
  req: Request,
  res: Response,
  type:
    BookingEvidenceType
) {
  const booking =
    res.locals
      .evidenceBooking as
      Booking |
      undefined;

  const user =
    res.locals
      .evidenceUser as
      User |
      undefined;

  const files =
    (
      req.files ??
      []
    ) as
      Express.Multer.File[];

  if (
    !booking ||
    !user
  ) {
    return res.status(500).json({
      error:
        "Evidence upload preflight was not run",
    });
  }

  if (
    files.length === 0
  ) {
    return res.status(400).json({
      error:
        "At least one image is required",
    });
  }

  const created =
    [];

  try {
    for (
      const file of files
    ) {
      const storageKey =
        path
          .relative(
            EVIDENCE_ROOT,
            file.path
          )
          .replace(
            /\\/g,
            "/"
          );

      const evidence =
        await bookingEvidenceStore
          .create({
            bookingId:
              booking.id,

            type,

            originalFileName:
              file.originalname,

            storageKey,

            mimeType:
              file.mimetype,

            fileSize:
              file.size,

            uploadedByUserId:
              user.id,
          });

      created.push(
        evidenceResponse(
          evidence
        )
      );
    }
  } catch (error) {
    for (
      const file of files
    ) {
      if (
        fs.existsSync(
          file.path
        )
      ) {
        fs.unlinkSync(
          file.path
        );
      }
    }

    throw error;
  }

  const total =
    await bookingEvidenceStore
      .countByType(
        booking.id,
        type,
        user.id
      );

  await auditLogsStore.create({
    entityType:
      "BOOKING",

    entityId:
      booking.id,

    action:
      `${type}_EVIDENCE_UPLOADED`,

    fieldName:
      `${type.toLowerCase()}EvidenceCount`,

    previousValue:
      String(
        total -
        created.length
      ),

    newValue:
      String(total),

    changedByUserId:
      user.id,

    changedByRole:
      user.role,

    changedByName:
      user.name,
  });

  return res.status(201).json({
    evidence:
      created,

    count:
      total,

    minimumRequired:
      MIN_EVIDENCE_IMAGES,

    requirementMet:
      total >=
      MIN_EVIDENCE_IMAGES,
  });
}

export const uploadPocEvidence =
  async (
    req: Request,
    res: Response
  ) =>
    uploadEvidence(
      req,
      res,
      "POC"
    );

export const uploadPodEvidence =
  async (
    req: Request,
    res: Response
  ) =>
    uploadEvidence(
      req,
      res,
      "POD"
    );

export const deleteBookingEvidence =
  async (
    req: Request,
    res: Response
  ) => {
    const bookingId =
      parseBookingId(
        req
      );

    const evidenceId =
      Number(
        req.params.evidenceId
      );

    if (
      bookingId === null ||
      Number.isNaN(
        evidenceId
      )
    ) {
      return res.status(400).json({
        error:
          "Invalid id",
      });
    }

    const user =
      await getRequestUser(
        req,
        res
      );

    if (!user) {
      return;
    }

    if (
      user.role !==
      "DRIVER"
    ) {
      return res.status(403).json({
        error:
          "Only drivers can remove booking evidence",
      });
    }

    const booking =
      await bookingsStore.getById(
        bookingId
      );

    if (!booking) {
      return res.status(404).json({
        error:
          "Booking not found",
      });
    }

    if (
      booking.assignedDriverId !==
      user.id
    ) {
      return res.status(403).json({
        error:
          "Only the assigned driver can remove evidence",
      });
    }

    const evidence =
      await bookingEvidenceStore
        .getById(
          evidenceId
        );

    if (
      !evidence ||
      evidence.bookingId !==
      bookingId
    ) {
      return res.status(404).json({
        error:
          "Evidence not found",
      });
    }

    if (
      evidence.uploadedByUserId !==
      user.id
    ) {
      return res.status(403).json({
        error:
          "You can only remove evidence that you uploaded",
      });
    }

    if (
      evidence.type ===
        "POC" &&
      booking.driverCollectedAt
    ) {
      return res.status(400).json({
        error:
          "POC cannot be removed after collection",
      });
    }

    if (
      evidence.type ===
        "POD" &&
      booking.driverDeliveredAt
    ) {
      return res.status(400).json({
        error:
          "POD cannot be removed after delivery",
      });
    }

    await bookingEvidenceStore
      .deleteById(
        evidenceId
      );

    const filePath =
      path.join(
        EVIDENCE_ROOT,
        evidence.storageKey
      );

    if (
      fs.existsSync(
        filePath
      )
    ) {
      fs.unlinkSync(
        filePath
      );
    }

    await auditLogsStore.create({
      entityType:
        "BOOKING",

      entityId:
        bookingId,

      action:
        `${evidence.type}_EVIDENCE_REMOVED`,

      fieldName:
        "evidenceId",

      previousValue:
        String(
          evidenceId
        ),

      newValue:
        null,

      changedByUserId:
        user.id,

      changedByRole:
        user.role,

      changedByName:
        user.name,
    });

    return res
      .status(204)
      .send();
  };