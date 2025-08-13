import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@providers/AuthProvider";
import NavBar from "@components/NavBar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Briefly.AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NavBar />
          <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
        </AuthProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
