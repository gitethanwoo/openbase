import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat Widget",
  description: "Embedded chat widget",
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
    <div
      style={{
        margin: 0,
        padding: 0,
        overflow: "hidden",
        backgroundColor: "transparent",
        height: "100vh",
        width: "100vw",
      }}
    >
      {children}
    </div>
  );
}
