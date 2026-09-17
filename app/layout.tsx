import type { Metadata } from "next";
import { Inter, Baloo_2 } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Rounded, chunky display face used only for the glossy "NOTELY" balloon wordmark.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["800"],
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
    <html lang="en" className={`${inter.variable} ${baloo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
