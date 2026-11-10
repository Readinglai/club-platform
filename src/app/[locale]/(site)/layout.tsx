import Navbar from "@/components/Navbar";

/** The public website's pages: the site navbar above each page. (Hilo Party's page sits outside this group, without it.) */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
    </>
  );
}
