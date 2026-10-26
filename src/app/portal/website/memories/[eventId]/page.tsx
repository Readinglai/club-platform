import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/access/require";
import { db } from "@/lib/db";
import { getEventMemories } from "@/lib/events/memories";
import WebsiteFrame from "../../WebsiteFrame";
import MemoriesEditor from "./MemoriesEditor";

export default async function EventMemoriesPage({ params }: { params: Promise<{ eventId: string }> }) {
  await requirePagePermission("memories.manage");
  const { eventId } = await params;
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, title: true } });
  if (!event) notFound();
  const [t, memories] = await Promise.all([getTranslations("portal.memoriesEditor"), getEventMemories(eventId)]);
  return (
    <WebsiteFrame title={event.title} subtitle={t("editorIntro")}>
      <MemoriesEditor eventId={eventId} initial={memories} />
    </WebsiteFrame>
  );
}
