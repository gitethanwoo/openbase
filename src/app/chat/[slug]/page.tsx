import { Metadata } from "next";
import { HelpChat } from "./help-chat";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Standalone help page for chatting with an agent
 * Public page that doesn't require authentication
 */
export default async function ChatPage({ params }: PageProps) {
  const { slug } = await params;

  return <HelpChat slug={slug} />;
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `Chat - ${slug}`,
    description: `Chat with our AI assistant`,
    robots: "index, follow",
  };
}
