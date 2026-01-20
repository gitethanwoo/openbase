import { EmbedChat } from "./embed-chat";

interface PageProps {
  params: Promise<{ agentId: string }>;
}

/**
 * Embed page for chat widget iframe
 * This page is loaded inside an iframe on customer websites
 */
export default async function EmbedPage({ params }: PageProps) {
  const { agentId } = await params;

  return <EmbedChat agentId={agentId} />;
}
