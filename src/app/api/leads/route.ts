import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { validateOrigin, createForbiddenResponse } from "@/lib/cors";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * CORS headers for leads API
 */
function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

interface LeadRequestBody {
  organizationId: string;
  agentId: string;
  conversationId?: string;
  name?: string;
  email?: string;
  phone?: string;
  customFields?: Record<string, string>;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  try {
    const body: LeadRequestBody = await request.json();

    // Validate required fields
    if (!body.organizationId || !body.agentId) {
      return new Response(
        JSON.stringify({ error: "organizationId and agentId are required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        }
      );
    }

    // Fetch agent to validate it exists and get organization
    const agent = await convex.query(api.agents.getAgent, {
      agentId: body.agentId as Id<"agents">,
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

    // Validate origin against organization's allowedDomains
    const org = await convex.query(api.organizations.getOrganization, {
      organizationId: agent.organizationId,
    });

    if (org) {
      const { allowed, corsOrigin } = validateOrigin(origin, org.allowedDomains);
      if (!allowed) {
        return createForbiddenResponse(corsOrigin);
      }
    }

    // Create the lead
    const leadId = await convex.mutation(api.leads.createLead, {
      organizationId: body.organizationId as Id<"organizations">,
      agentId: body.agentId as Id<"agents">,
      conversationId: body.conversationId
        ? (body.conversationId as Id<"conversations">)
        : undefined,
      name: body.name,
      email: body.email,
      phone: body.phone,
      customFields: body.customFields,
      source: "widget",
    });

    return new Response(
      JSON.stringify({ success: true, leadId }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      }
    );
  } catch (error) {
    console.error("Error creating lead:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      }
    );
  }
}
