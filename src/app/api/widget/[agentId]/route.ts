import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { validateOrigin, createForbiddenResponse } from "@/lib/cors";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * CORS headers for widget API
 * Allows the widget to be embedded on any domain
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
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const origin = request.headers.get("origin");

  try {
    // Fetch agent from Convex
    const agent = await convex.query(api.agents.getAgent, {
      agentId: agentId as Id<"agents">,
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

    // Validate origin against organization's allowedDomains
    const org = await convex.query(api.organizations.getOrganization, {
      organizationId: agent.organizationId,
    });

    if (org) {
      const { allowed, corsOrigin } = validateOrigin(
        origin,
        org.allowedDomains
      );
      if (!allowed) {
        return createForbiddenResponse(corsOrigin);
      }
    }

    // Return agent data for widget initialization
    const widgetData = {
      id: agent._id,
      name: agent.name,
      organizationId: agent.organizationId,
      widgetConfig: agent.widgetConfig,
      leadCaptureConfig: agent.leadCaptureConfig,
    };

    return new Response(JSON.stringify(widgetData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=60",
        ...corsHeaders(origin),
      },
    });
  } catch (error) {
    console.error("Error fetching agent for widget:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(origin),
      },
    });
  }
}
