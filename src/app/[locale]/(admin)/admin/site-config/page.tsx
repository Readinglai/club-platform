import { redirect } from "next/navigation";

/** Moved to the portal. */
export default function MovedPage() {
  redirect("/portal/website/settings");
}
