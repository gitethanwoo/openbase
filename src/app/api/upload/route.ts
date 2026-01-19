import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const organizationId = formData.get("organizationId") as string | null;
  const agentId = formData.get("agentId") as string | null;

  // Validate required fields
  if (!file) {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!organizationId || !agentId) {
    return new Response(
      JSON.stringify({ error: "organizationId and agentId are required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return new Response(
      JSON.stringify({
        error: `Invalid file type: ${file.type}. Allowed types: PDF, DOCX, TXT`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return new Response(
      JSON.stringify({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Step 1: Get upload URL from Convex
  const uploadUrl = await convex.mutation(api.sources.generateUploadUrl, {});

  // Step 2: Upload file to Convex storage
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to upload file to storage" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { storageId } = (await uploadResponse.json()) as { storageId: string };

  // Step 3: Create source record in Convex
  const { sourceId } = await convex.mutation(api.sources.createFileSource, {
    organizationId: organizationId as Id<"organizations">,
    agentId: agentId as Id<"agents">,
    fileId: storageId as Id<"_storage">,
    fileName: file.name,
    mimeType: file.type,
    sizeKb: Math.ceil(file.size / 1024),
  });

  return new Response(
    JSON.stringify({
      sourceId,
      fileName: file.name,
      mimeType: file.type,
      sizeKb: Math.ceil(file.size / 1024),
      status: "pending",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
