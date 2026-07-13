import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ActiveJobPill from "@/components/ActiveJobPill";
import GlobalSearch from "@/components/GlobalSearch";
import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pronghorn Platform",
  description: "Deal sourcing & CRM — Pronghorn Equity Partners",
  // Installable on iOS/Android home screens (John reviews on mobile)
  appleWebApp: { capable: true, title: "Pronghorn", statusBarStyle: "black-translucent" },
  icons: { apple: "/pronghorn-logo.png" },
};

export const viewport = {
  themeColor: "#17301F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
        <div className="flex min-h-screen">
          <div className="hidden md:flex">
            <Sidebar />
          </div>
          <div className="flex h-screen min-w-0 flex-1 flex-col">
            <div className="z-40 flex items-center gap-3 border-b border-zinc-200 bg-zinc-50/90 px-4 py-2 backdrop-blur">
              <MobileNav>
                <Sidebar />
              </MobileNav>
              <div className="flex flex-1 justify-center">
                <GlobalSearch />
              </div>
              <ActiveJobPill />
            </div>
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
