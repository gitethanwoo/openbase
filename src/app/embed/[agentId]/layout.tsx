import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "../../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat Widget",
  description: "Embedded chat widget",
  // Prevent search engines from indexing iframe content
  robots: "noindex, nofollow",
};

/**
 * Minimal layout for embedded widget iframe
 * No auth providers - widget authenticates via agentId and allowed domains
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Allow embedding in iframes */}
        <meta name="referrer" content="origin" />
      </head>
      <body
        className={`${geistSans.variable} antialiased`}
        style={{
          margin: 0,
          padding: 0,
          overflow: "hidden",
          backgroundColor: "transparent",
        }}
      >
        {children}
      </body>
    </html>
  );
}
