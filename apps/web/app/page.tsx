import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { homeForUser } from "@/lib/authz";

export default async function HomePage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (!user) redirect("/login");
  redirect(homeForUser(user));
}
