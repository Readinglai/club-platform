"use client";

/**
 * AlumniPhotoCard — Client Component
 *
 * 獨立為 Client Component 的原因：
 * alumni/page.tsx 是 Server Component，但 <img onError> 是 client-side 事件。
 * 在 React 19 / Next.js App Router 的 Server Component 中使用事件 handler
 * 會導致 production build 的 render 崩潰（digest: 3287442906）。
 * 將圖片區塊抽出為 Client Component 可完全解決此問題。
 */

interface Props {
  photoUrl: string | null;
  name: string;
}

export default function AlumniPhotoCard({ photoUrl, name }: Props) {
  if (!photoUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={name}
      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow mb-3 mx-auto"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
