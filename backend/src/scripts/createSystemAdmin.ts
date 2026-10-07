import "dotenv/config";

import bcrypt from "bcryptjs";

import {
  usersStore,
} from "../store/users.store";

const {
  prisma,
} = require(
  "../lib/prisma"
);

async function main() {
  const name =
    process.env.ADMIN_NAME;

  const username =
    process.env.ADMIN_USERNAME;

  const email =
    process.env.ADMIN_EMAIL;

  const password =
    process.env.ADMIN_PASSWORD;

  if (
    !name ||
    !username ||
    !email ||
    !password
  ) {
    throw new Error(
      "ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD are required"
    );
  }

  if (
    password.length < 10
  ) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 10 characters"
    );
  }

  const existing =
    await usersStore
      .findByEmailOrUsername(
        email
      );

  if (existing) {
    throw new Error(
      "A user with that email or username already exists"
    );
  }

  const usernameExisting =
    await usersStore
      .findByEmailOrUsername(
        username
      );

  if (
    usernameExisting
  ) {
    throw new Error(
      "A user with that username already exists"
    );
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      12
    );

  const user =
    await usersStore
      .create({
        name:
          name.trim(),

        username:
          username.trim(),

        email:
          email
            .trim()
            .toLowerCase(),

        passwordHash,

        role:
          "SYSTEM_ADMIN",

        customerAccountId:
          null,
      });

  console.log(
    `Created SYSTEM_ADMIN ${user.username} (${user.email})`
  );
}

main()
  .catch(
    (
      error
    ) => {
      console.error(
        error
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      await prisma
        .$disconnect();
    }
  );