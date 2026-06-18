import { apiRequest } from "./client";
import type { User } from "../types";

export function getCurrentUser(userId: string) {
  return apiRequest<User>("/users/me", {
    headers: {
      "x-user-id": userId,
    },
  });
}

export function getUsers(currentUser: User) {
  return apiRequest<User[]>("/users", {}, currentUser);
}