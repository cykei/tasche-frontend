import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Tasche",
  description: "Todoist-style Planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden text-sm bg-[#fafafa]">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 h-full overflow-hidden relative p-4">
          <div className="h-full w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
