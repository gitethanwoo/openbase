/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as analytics from "../analytics.js";
import type * as braintrust from "../braintrust.js";
import type * as chat from "../chat.js";
import type * as chatApi from "../chatApi.js";
import type * as chatStream from "../chatStream.js";
import type * as chunks from "../chunks.js";
import type * as cors from "../cors.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as judge from "../judge.js";
import type * as openrouter from "../openrouter.js";
import type * as organizations from "../organizations.js";
import type * as rag from "../rag.js";
import type * as sources from "../sources.js";
import type * as testHelpers from "../testHelpers.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  analytics: typeof analytics;
  braintrust: typeof braintrust;
  chat: typeof chat;
  chatApi: typeof chatApi;
  chatStream: typeof chatStream;
  chunks: typeof chunks;
  cors: typeof cors;
  http: typeof http;
  jobs: typeof jobs;
  judge: typeof judge;
  openrouter: typeof openrouter;
  organizations: typeof organizations;
  rag: typeof rag;
  sources: typeof sources;
  testHelpers: typeof testHelpers;
  usage: typeof usage;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  persistentTextStreaming: {
    lib: {
      addChunk: FunctionReference<
        "mutation",
        "internal",
        { final: boolean; streamId: string; text: string },
        any
      >;
      createStream: FunctionReference<"mutation", "internal", {}, any>;
      getStreamStatus: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        "pending" | "streaming" | "done" | "error" | "timeout"
      >;
      getStreamText: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          text: string;
        }
      >;
      setStreamStatus: FunctionReference<
        "mutation",
        "internal",
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          streamId: string;
        },
        any
      >;
    };
  };
};
