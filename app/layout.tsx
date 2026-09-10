import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Biên bản cuộc họp",
  description: "Tạo biên bản cuộc họp và danh sách việc cần làm từ ghi chú, ảnh và ghi âm.",
};

// Typed plainly (not via the generated `LayoutProps<"/">` helper): that helper is only
// emitted into `.next/types` by `next dev`/`next build`, so a clean checkout fails
// `tsc --noEmit` before those types exist. `{ children: React.ReactNode }` is the
// documented App Router layout signature and needs no generated types.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
