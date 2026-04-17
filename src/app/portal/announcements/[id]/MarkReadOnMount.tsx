/**
 * MarkReadOnMount.tsx — 自動標記已讀（Client Component）
 *
 * 功能：頁面掛載時呼叫 POST /api/announcements/[id]/read，將公告標記為已讀
 * 輸入：announcementId — 公告 ID
 * 輸出：無 UI（純副作用）
 */

"use client";

import { useEffect } from "react";

interface Props {
  announcementId: string;
}

export function MarkReadOnMount({ announcementId }: Props) {
  useEffect(() => {
    fetch(`/api/announcements/${announcementId}/read`, {
      method: "POST",
    }).catch(() => {
      // 標記失敗不影響頁面顯示，靜默處理
    });
  }, [announcementId]);

  return null;
}
