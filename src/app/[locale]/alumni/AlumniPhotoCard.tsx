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

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Props {
  photoUrl: string | null;
  name: string;
}

export default function AlumniPhotoCard({ photoUrl, name }: Props) {
  return (
    <div
      className="h-40 flex items-center justify-center"
      style={{ backgroundColor: `${PRIMARY}18` }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={name}
          className="w-24 h-24 rounded-full object-cover border-4 border-white shadow"
          onError={(e) => {
            // 若圖片載入失敗，隱藏圖片（Server Component 不支援 onError，故抽出此元件）
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        /* 無大頭貼時顯示姓名首字母 */
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white shadow"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
