import { redirect } from "next/navigation";

/** Moved to the portal. */
export default async function MovedPage({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/portal/website/sponsors/${(await params).id}`);
}
