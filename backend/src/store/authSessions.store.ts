const {
  prisma,
} = require(
  "../lib/prisma"
);

const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  customerAccountId: true,
  createdAt: true,
  updatedAt: true,
};

export const authSessionsStore = {
  async create(
    userId: number,
    refreshTokenHash: string,
    expiresAt: Date
  ) {
    return prisma
      .authSession
      .create({
        data: {
          userId,
          refreshTokenHash,
          expiresAt,
        },
      });
  },

  async getByIdWithUser(
    id: string
  ) {
    return prisma
      .authSession
      .findUnique({
        where: {
          id,
        },

        include: {
          user: {
            select:
              publicUserSelect,
          },
        },
      });
  },

  async getByRefreshTokenHash(
    refreshTokenHash: string
  ) {
    return prisma
      .authSession
      .findUnique({
        where: {
          refreshTokenHash,
        },

        include: {
          user: {
            select:
              publicUserSelect,
          },
        },
      });
  },

  async rotate(
    oldSessionId: string,
    userId: number,
    newRefreshTokenHash:
      string,
    newExpiresAt: Date
  ) {
    return prisma.$transaction(
      async (
        tx: any
      ) => {
        const now =
          new Date();

        const revoked =
          await tx
            .authSession
            .updateMany({
              where: {
                id:
                  oldSessionId,

                userId,

                revokedAt:
                  null,

                expiresAt: {
                  gt: now,
                },
              },

              data: {
                revokedAt:
                  now,

                lastUsedAt:
                  now,
              },
            });

        if (
          revoked.count !==
          1
        ) {
          return null;
        }

        return tx
          .authSession
          .create({
            data: {
              userId,

              refreshTokenHash:
                newRefreshTokenHash,

              expiresAt:
                newExpiresAt,
            },
          });
      }
    );
  },

  async revokeByRefreshTokenHash(
    refreshTokenHash: string
  ) {
    return prisma
      .authSession
      .updateMany({
        where: {
          refreshTokenHash,
          revokedAt:
            null,
        },

        data: {
          revokedAt:
            new Date(),
        },
      });
  },

  async revokeAllForUser(
    userId: number
  ) {
    return prisma
      .authSession
      .updateMany({
        where: {
          userId,
          revokedAt:
            null,
        },

        data: {
          revokedAt:
            new Date(),
        },
      });
  },

  async deleteExpired() {
    return prisma
      .authSession
      .deleteMany({
        where: {
          expiresAt: {
            lt:
              new Date(),
          },
        },
      });
  },
};