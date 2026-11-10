/** Hilo Party's page: no site navbar (see ../(site)/layout.tsx). English at /hilo, Chinese at /zh/hilo. */
export default function HiloLayout({ children }: { children: React.ReactNode }) {
  return <div className="ticket-page">{children}</div>;
}
