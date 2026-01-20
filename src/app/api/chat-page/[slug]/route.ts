import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * CORS headers for chat page API
 * Allows the standalone chat page to be accessed from any domain
 */
function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const origin = request.headers.get("origin");

  try {
    // Fetch agent by slug from Convex
    const agent = await convex.query(api.agents.getAgentBySlug, {
      slug,
    });

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      });
    }

    // Check if agent is active (not draft or archived)
    if (agent.status === "archived" || agent.deletedAt) {
      return new Response(JSON.stringify({ error: "Agent not available" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      });
    }

    // Return agent data for chat page
    const chatPageData = {
      id: agent._id,
      name: agent.name,
      slug: agent.slug,
      organizationId: agent.organizationId,
      widgetConfig: agent.widgetConfig,
    };

    return new Response(JSON.stringify(chatPageData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=60",
        ...corsHeaders(origin),
      },
    });
  } catch (error) {
    console.error("Error fetching agent for chat page:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(origin),
      },
    });
  }
}
