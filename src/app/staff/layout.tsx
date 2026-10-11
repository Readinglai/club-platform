import { Big_Shoulders, IBM_Plex_Mono } from "next/font/google";

// Door-staff fonts: condensed box-office display + ticket-stub mono.
const display = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-door-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-door-mono",
});

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${mono.variable}`}>{children}</div>
  );
}
