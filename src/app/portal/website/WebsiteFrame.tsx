const PRIMARY = "#1a2744";

/** Common page frame for the website-editing pages. */
export default function WebsiteFrame({
  title,
  subtitle,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-10 text-gray-900" style={{ backgroundColor: "#f9f7f4" }}>
      <div className={`mx-auto w-full ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
