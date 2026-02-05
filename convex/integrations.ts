"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { WorkOS } from "@workos-inc/node";

const NOTION_PROVIDER = "notion";
const GDRIVE_PROVIDER = "google_drive";

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

const GDRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3";

const GDRIVE_SUPPORTED_MIME_TYPES = [
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/pdf",
  "text/plain",
] as const;

type PipesAccessToken = {
  active: true;
  accessToken: {
    object: "access_token";
    accessToken: string;
    expiresAt: Date | null;
    scopes: string[];
    missingScopes: string[];
  };
};

type PipesAccessTokenError = {
  active: false;
  error: "not_installed" | "needs_reauthorization";
};

type PipesAccessTokenResponse = PipesAccessToken | PipesAccessTokenError;

let _workos: WorkOS | null = null;

function getWorkOS(): WorkOS {
  if (!_workos) {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) {
      throw new Error("WORKOS_API_KEY environment variable is not set");
    }
    _workos = new WorkOS(apiKey);
  }
  return _workos;
}

async function getPipesAccessToken(
  provider: string,
  workosUserId: string
): Promise<PipesAccessTokenResponse> {
  return await getWorkOS().pipes.getAccessToken({
    provider,
    userId: workosUserId,
  });
}

// =============================
// Notion
// =============================

type NotionRichText = {
  plain_text: string;
};

type NotionTitleProperty = {
  type: "title";
  title: NotionRichText[];
};

type NotionProperty = NotionTitleProperty | { type: string };

type NotionPage = {
  object: "page";
  id: string;
  url: string;
  last_edited_time: string;
  properties: Record<string, NotionProperty>;
};

type NotionSearchResponse = {
  object: "list";
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
};

type NotionPageSummary = {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
};

type NotionListResult =
  | { status: "connected"; pages: NotionPageSummary[] }
  | { status: "not_installed" | "needs_reauthorization"; pages: [] };

function isTitleProperty(
  property: NotionProperty
): property is NotionTitleProperty {
  return (
    property.type === "title" &&
    Array.isArray((property as NotionTitleProperty).title)
  );
}

function getNotionPageTitle(properties: Record<string, NotionProperty>): string {
  for (const property of Object.values(properties)) {
    if (isTitleProperty(property)) {
      return property.title.map((text) => text.plain_text).join("").trim();
    }
  }
  return "Untitled";
}

export const listNotionPages = action({
  args: {
    limit: v.optional(v.number()),
    workosUserId: v.string(),
  },
  handler: async (ctx, args): Promise<NotionListResult> => {
    const limit = args.limit ?? 50;

    const tokenResponse = await getPipesAccessToken(
      NOTION_PROVIDER,
      args.workosUserId
    );

    if (!tokenResponse.active) {
      return { status: tokenResponse.error, pages: [] };
    }

    const pages: NotionPageSummary[] = [];
    let nextCursor: string | null = null;

    while (pages.length < limit) {
      const response = await fetch(`${NOTION_API_BASE_URL}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken.accessToken}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: { property: "object", value: "page" },
          sort: { direction: "descending", timestamp: "last_edited_time" },
          page_size: Math.min(50, limit - pages.length),
          start_cursor: nextCursor ?? undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Notion API error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as NotionSearchResponse;

      for (const page of data.results) {
        pages.push({
          id: page.id,
          title: getNotionPageTitle(page.properties),
          url: page.url,
          lastEditedTime: page.last_edited_time,
        });
      }

      if (!data.has_more || !data.next_cursor) {
        break;
      }

      nextCursor = data.next_cursor;
    }

    return { status: "connected", pages };
  },
});

// =============================
// Google Drive
// =============================

type GDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
};

type GDriveListResponse = {
  files: GDriveFile[];
  nextPageToken?: string;
};

type GDriveFileSummary = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  sizeKb?: number;
  webViewLink?: string;
};

type GDriveListResult =
  | { status: "connected"; files: GDriveFileSummary[] }
  | { status: "not_installed" | "needs_reauthorization"; files: [] };

function buildMimeTypeQuery(): string {
  const parts = GDRIVE_SUPPORTED_MIME_TYPES.map(
    (mimeType) => `mimeType='${mimeType}'`
  );
  return `trashed = false and (${parts.join(" or ")})`;
}

export const listGDriveFiles = action({
  args: {
    limit: v.optional(v.number()),
    workosUserId: v.string(),
  },
  handler: async (ctx, args): Promise<GDriveListResult> => {
    const limit = args.limit ?? 50;

    const tokenResponse = await getPipesAccessToken(
      GDRIVE_PROVIDER,
      args.workosUserId
    );

    if (!tokenResponse.active) {
      return { status: tokenResponse.error, files: [] };
    }

    const files: GDriveFileSummary[] = [];
    let nextPageToken: string | undefined = undefined;

    while (files.length < limit) {
      const params = new URLSearchParams({
        q: buildMimeTypeQuery(),
        pageSize: String(Math.min(50, limit - files.length)),
        fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,webViewLink)",
      });

      if (nextPageToken) {
        params.set("pageToken", nextPageToken);
      }

      const response = await fetch(
        `${GDRIVE_API_BASE_URL}/files?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.accessToken.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Drive API error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as GDriveListResponse;

      for (const file of data.files) {
        const sizeBytes = file.size ? Number(file.size) : undefined;
        const sizeKb =
          sizeBytes !== undefined && !Number.isNaN(sizeBytes)
            ? Math.ceil(sizeBytes / 1024)
            : undefined;
        files.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
          sizeKb,
          webViewLink: file.webViewLink,
        });
      }

      if (!data.nextPageToken) {
        break;
      }

      nextPageToken = data.nextPageToken;
    }

    return { status: "connected", files };
  },
});
