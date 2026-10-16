import PortalNav from "./PortalNav";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortalNav />
      {children}
    </>
  );
}
