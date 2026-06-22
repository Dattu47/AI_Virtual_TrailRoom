import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { freeModeUser, isFreeMode } from "@/lib/runtime";

export async function requireSession() {
  if (isFreeMode) {
    return { user: freeModeUser };
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session;
}
