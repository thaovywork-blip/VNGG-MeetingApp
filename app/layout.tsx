import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Notely",
  description: "Generate meeting minutes and an action list from notes, photos, and audio recordings.",
};

// Typed plainly (not via the generated `LayoutProps<"/">` helper): that helper is only
// emitted into `.next/types` by `next dev`/`next build`, so a clean checkout fails
// `tsc --noEmit` before those types exist. `{ children: React.ReactNode }` is the
// documented App Router layout signature and needs no generated types.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
