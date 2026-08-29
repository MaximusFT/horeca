import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Misto Kitchen Procurement",
  description: "AI-assisted HoReCa procurement cockpit",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
