import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function HomePage() {
  // Never throw from `/` — DB outages should still reach login
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  redirect(user ? "/week" : "/login");
}
