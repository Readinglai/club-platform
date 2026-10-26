import { redirect } from "next/navigation";

/** Profile editing lives in one place: the full profile form. */
export default function ProfileEditPage() {
  redirect("/portal/complete-profile");
}
