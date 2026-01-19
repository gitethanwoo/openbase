# Vercel Workflow SDK

> Source: https://github.com/vercel/workflow
> Full docs: https://useworkflow.dev

The Workflow Development Kit (WDK) is an open source TypeScript framework that makes durability a language-level concept. Functions can pause for minutes or months, survive deployments and crashes, and resume exactly where they stopped.

---

## Getting Started

---

title: Getting Started
description: Start by choosing your framework. Each guide will walk you through the steps to install the dependencies and start running your first workflow.

---

import { Next, Nitro, SvelteKit, Nuxt, Hono, Bun, AstroDark, AstroLight, TanStack, Vite, Express, Nest, Fastify } from "@/app/(home)/components/frameworks";

<Cards>
    <Card href="/docs/getting-started/next">
      <div  className="flex flex-col items-center justify-center gap-2"> <Next className="size-16" /> <span className="font-medium">Next.js</span> </div>
    </Card>
    <Card href="/docs/getting-started/vite">
     <div className="flex flex-col items-center justify-center gap-2">
        <Vite className="size-16" />
        <span className="font-medium">Vite</span>
     </div>
    </Card>
    <Card href="/docs/getting-started/astro">
      <div className="flex flex-col items-center justify-center gap-2">
        <AstroLight className="size-16 dark:hidden" />
        <AstroDark className="size-16 hidden dark:block" />
        <span className="font-medium">Astro</span>
      </div>
    </Card>
    <Card href="/docs/getting-started/express" >
    <div className="flex flex-col items-center justify-center gap-2">
        <Express className="size-16 dark:invert" />
        <span className="font-medium">Express</span>
    </div>
    </Card>
    <Card href="/docs/getting-started/fastify" >
    <div className="flex flex-col items-center justify-center text-center gap-2">
        <Fastify className="size-16 dark:invert" />
        <span className="font-medium">Fastify</span>
    </div>
    </Card>
    <Card href="/docs/getting-started/hono">
     <div className="flex flex-col items-center justify-center gap-2">
        <Hono className="size-16" />
        <span className="font-medium">Hono</span>
     </div>
    </Card>
    <Card href="/docs/getting-started/nitro" >
     <div className="flex flex-col items-center justify-center gap-2">
        <Nitro className="size-16" />
        <span className="font-medium">Nitro</span>
     </div>
    </Card>
    <Card href="/docs/getting-started/nuxt" >
      <div className="flex flex-col items-center justify-center gap-2">
        <Nuxt className="size-16" />
        <span className="font-medium">Nuxt</span>
      </div>
    </Card>
    <Card href="/docs/getting-started/sveltekit" >
     <div className="flex flex-col items-center justify-center gap-2">
        <SvelteKit className="size-16" />
        <span className="font-medium">SvelteKit</span>
     </div>
    </Card>
    <Card className="opacity-50">
      <div className="flex flex-col items-center justify-center gap-2">
        <Nest className="size-16 dark:invert grayscale" />
        <span className="font-medium">NestJS</span>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
    </Card>
    <Card className="opacity-50">
      <div className="flex flex-col items-center justify-center gap-2">
        <TanStack className="size-16 dark:invert grayscale" />
        <span className="font-medium">TanStack Start</span>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
    </Card>
</Cards>

---

## Next.js Integration

---

title: Next.js
description: This guide will walk through setting up your first workflow in a Next.js app. Along the way, you'll learn more about the concepts that are fundamental to using the development kit in your own projects.

---

<Steps>

<Step>
## Create Your Next.js Project

Start by creating a new Next.js project. This command will create a new directory named `my-workflow-app` and set up a Next.js project inside it.

```bash
npm create next-app@latest my-workflow-app
```

Enter the newly created directory:

```bash
cd my-workflow-app
```

### Install `workflow`

```package-install
npm i workflow
```

### Configure Next.js

Wrap your `next.config.ts` with `withWorkflow()`. This enables usage of the `"use workflow"` and `"use step"` directives.

```typescript title="next.config.ts" lineNumbers
import { withWorkflow } from "workflow/next"; // [!code highlight]
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // … rest of your Next.js config
};

export default withWorkflow(nextConfig); // [!code highlight]
```

<Accordion type="single" collapsible>
  <AccordionItem value="typescript-intellisense" className="[&_h3]:my-0">
    <AccordionTrigger className="text-sm">
      ### Setup IntelliSense for TypeScript (Optional)
    </AccordionTrigger>
    <AccordionContent className="[&_p]:my-2">

To enable helpful hints in your IDE, setup the workflow plugin in `tsconfig.json`:

```json title="tsconfig.json" lineNumbers
{
  "compilerOptions": {
    // ... rest of your TypeScript config
    "plugins": [
      {
        "name": "workflow" // [!code highlight]
      }
    ]
  }
}
```

    </AccordionContent>

  </AccordionItem>
</Accordion>

<Accordion type="single" collapsible>
  <AccordionItem value="typescript-intellisense" className="[&_h3]:my-0">
    <AccordionTrigger className="text-sm">
      ### Configure Proxy Handler (if applicable)
    </AccordionTrigger>
    <AccordionContent className="[&_p]:my-2">

If your Next.js app has a [proxy handler](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
(formerly known as "middleware"), you'll need to update the matcher pattern to exclude Workflow's
internal paths to prevent the proxy handler from running on them.

Add `.well-known/workflow/*` to your middleware's exclusion list:

```typescript title="proxy.ts" lineNumbers
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Your middleware logic
  return NextResponse.next();
}

export const config = {
  matcher: [
    // ... your existing matchers
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.well-known/workflow/).*)", // [!code highlight]
    },
  ],
};
```

This ensures that internal Workflow paths are not intercepted by your middleware, which could interfere with workflow execution and resumption.
</AccordionContent>
</AccordionItem>
</Accordion>

</Step>

<Step>

## Create Your First Workflow

Create a new file for our first workflow:

```typescript title="workflows/user-signup.ts" lineNumbers
import { sleep } from "workflow";

export async function handleUserSignup(email: string) {
  "use workflow"; // [!code highlight]

  const user = await createUser(email);
  await sendWelcomeEmail(user);

  await sleep("5s"); // Pause for 5s - doesn't consume any resources
  await sendOnboardingEmail(user);

  console.log("Workflow is complete! Run 'npx workflow web' to inspect your run");

  return { userId: user.id, status: "onboarded" };
}
```

We'll fill in those functions next, but let's take a look at this code:

- We define a **workflow** function with the directive `"use workflow"`. Think of the workflow function as the _orchestrator_ of individual **steps**.
- The Workflow DevKit's `sleep` function allows us to suspend execution of the workflow without using up any resources. A sleep can be a few seconds, hours, days, or even months long.

## Create Your Workflow Steps

Let's now define those missing functions.

```typescript title="workflows/user-signup.ts" lineNumbers
import { FatalError } from "workflow";

// Our workflow function defined earlier

async function createUser(email: string) {
  "use step"; // [!code highlight]

  console.log(`Creating user with email: ${email}`);

  // Full Node.js access - database calls, APIs, etc.
  return { id: crypto.randomUUID(), email };
}

async function sendWelcomeEmail(user: { id: string; email: string }) {
  "use step"; // [!code highlight]

  console.log(`Sending welcome email to user: ${user.id}`);

  if (Math.random() < 0.3) {
    // By default, steps will be retried for unhandled errors
    throw new Error("Retryable!");
  }
}

async function sendOnboardingEmail(user: { id: string; email: string }) {
  "use step"; // [!code highlight]

  if (!user.email.includes("@")) {
    // To skip retrying, throw a FatalError instead
    throw new FatalError("Invalid Email");
  }

  console.log(`Sending onboarding email to user: ${user.id}`);
}
```

Taking a look at this code:

- Business logic lives inside **steps**. When a step is invoked inside a **workflow**, it gets enqueued to run on a separate request while the workflow is suspended, just like `sleep`.
- If a step throws an error, like in `sendWelcomeEmail`, the step will automatically be retried until it succeeds (or hits the step's max retry count).
- Steps can throw a `FatalError` if an error is intentional and should not be retried.

<Callout>
We'll dive deeper into workflows, steps, and other ways to suspend or handle events in [Foundations](/docs/foundations).
</Callout>

</Step>

<Step>

## Create Your Route Handler

To invoke your new workflow, we'll need to add your workflow to a `POST` API Route Handler, `app/api/signup/route.ts`, with the following code:

```typescript title="app/api/signup/route.ts"
import { start } from "workflow/api";
import { handleUserSignup } from "@/workflows/user-signup";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json();

  // Executes asynchronously and doesn't block your app
  await start(handleUserSignup, [email]);

  return NextResponse.json({
    message: "User signup workflow started",
  });
}
```

This Route Handler creates a `POST` request endpoint at `/api/signup` that will trigger your workflow.

<Callout>
Workflows can be triggered from API routes, Server Actions, or any server-side code.
</Callout>

</Step>

</Steps>

## Run in development

To start your development server, run the following command in your terminal in the Next.js root directory:

```bash
npm run dev
```

Once your development server is running, you can trigger your workflow by running this command in the terminal:

```bash
curl -X POST --json '{"email":"hello@example.com"}' http://localhost:3000/api/signup
```

Check the Next.js development server logs to see your workflow execute, as well as the steps that are being processed.

Additionally, you can use the [Workflow DevKit CLI or Web UI](/docs/observability) to inspect your workflow runs and steps in detail.

```bash
# Open the observability Web UI
npx workflow web
# or if you prefer a terminal interface, use the CLI inspect command
npx workflow inspect runs
```

<img src="/o11y-ui.png" alt="Workflow DevKit Web UI" />

## Deploying to production

Workflow DevKit apps currently work best when deployed to [Vercel](https://vercel.com/home) and need no special configuration.

Check the [Deploying](/docs/deploying) section to learn how your workflows can be deployed elsewhere.

## Troubleshooting

### Next.js 16.1+ compatibility

If you see this error when upgrading to Next.js 16.1 or later:

```
Build error occurred
Error: Cannot find module 'next/dist/lib/server-external-packages.json'
```

Upgrade to `workflow@4.0.1-beta.26` or later:

```package-install
workflow@latest
```

## Next Steps

- Learn more about the [Foundations](/docs/foundations).
- Check [Errors](/docs/errors) if you encounter issues.
- Explore the [API Reference](/docs/api-reference).

---

## Workflows and Steps

---

## title: Workflows and Steps

import { File, Folder, Files } from "fumadocs-ui/components/files";

Workflows (a.k.a. _durable functions_) are a programming model for building long-running, stateful application logic that can maintain its execution state across restarts, failures, or user events. Unlike traditional serverless functions that lose all state when they terminate, workflows persist their progress and can resume exactly where they left off.

Moreover, workflows let you easily model complex multi-step processes in simple, elegant code. To do this, we introduce two fundamental entities:

1. **Workflow Functions**: Functions that orchestrate/organize steps
2. **Step Functions**: Functions that carry out the actual work

## Workflow Functions

_Directive: `"use workflow"`_

Workflow functions define the entrypoint of a workflow and organize how step functions are called. This type of function does not have access to the Node.js runtime, and usable `npm` packages are limited.

Although this may seem limiting initially, this feature is important in order to suspend and accurately resume execution of workflows.

It helps to think of the workflow function less like a full JavaScript runtime and more like "stitching together" various steps using conditionals, loops, try/catch handlers, `Promise.all`, and other language primitives.

```typescript lineNumbers
export async function processOrderWorkflow(orderId: string) {
  "use workflow"; // [!code highlight]

  // Orchestrate multiple steps
  const order = await fetchOrder(orderId);
  const payment = await chargePayment(order);

  return { orderId, status: "completed" };
}
```

**Key Characteristics:**

- Runs in a sandboxed environment without full Node.js access
- All step results are persisted to the event log
- Must be **deterministic** to allow resuming after failures

Determinism in the workflow is required to resume the workflow from a suspension. Essentially, the workflow code gets re-run multiple times during its lifecycle, each time using an event log to resume the workflow to the correct spot.

The sandboxed environment that workflows run in already ensures determinism. For instance, `Math.random` and `Date` constructors are fixed in workflow runs, so you are safe to use them, and the framework ensures that the values don't change across replays.

## Step Functions

_Directive: `"use step"`_

Step functions perform the actual work in a workflow and have full runtime access.

```typescript lineNumbers
async function chargePayment(order: Order) {
  "use step"; // [!code highlight]

  // Full Node.js access - use any npm package
  const stripe = new Stripe(process.env.STRIPE_KEY);

  const charge = await stripe.charges.create({
    amount: order.total,
    currency: "usd",
    source: order.paymentToken,
  });

  return { chargeId: charge.id };
}
```

**Key Characteristics:**

- Full Node.js runtime and npm package access
- Automatic retry on errors
- Results persisted for replay

By default, steps have a maximum of 3 retry attempts before they fail and propagate the error to the workflow. Learn more about errors and retrying in the [Errors & Retrying](/docs/foundations/errors-and-retries) page.

<Callout type="warning">
**Important:** Due to serialization, parameters are passed by **value, not by reference**. If you pass an object or array to a step and mutate it, those changes will **not** be visible in the workflow context. Always return modified data from your step functions instead. See [Pass-by-Value Semantics](/docs/foundations/serialization#pass-by-value-semantics) for details and examples.
</Callout>

<Callout type="info">
Step functions are primarily meant to be used inside a workflow.
</Callout>

Calling a step from outside a workflow or from another step will essentially run the step in the same process like a normal function (in other words, the `use step` directive is a no-op). This means you can reuse step functions in other parts of your codebase without needing to duplicate business logic.

{/_ @skip-typecheck: incomplete code sample _/}

```typescript lineNumbers
async function updateUser(userId: string) {
  "use step";
  await db.insert(...);
}

// Used inside a workflow
export async function userOnboardingWorkflow(userId: string) {
  "use workflow";
  await updateUser(userId);
  // ... more steps
}

// Used directly outside a workflow
export async function POST() {
  await updateUser("123");
  // ... more logic
}
```

<Callout type="info">
Keep in mind that calling a step function outside of a workflow function will not have retry semantics, nor will it be observable. Additionally, certain workflow-specific functions like [`getStepMetadata()`](/docs/api-reference/workflow/get-step-metadata) will throw an error when used inside a step that's called outside a workflow.
</Callout>

### Suspension and Resumption

Workflow functions have the ability to automatically suspend while they wait on asynchronous work. While suspended, the workflow's state is stored via the event log and no compute resources are used until the workflow resumes execution.

There are multiple ways a workflow can suspend:

- Waiting on a step function: the workflow yields while the step runs in the step runtime.
- Using `sleep()` to pause for some fixed duration.
- Awaiting on a promise returned by [`createWebhook()`](/docs/api-reference/workflow/create-webhook), which resumes the workflow when an external system passes data into the workflow.

```typescript lineNumbers
import { sleep, createWebhook } from "workflow";

export async function documentReviewProcess(userId: string) {
  "use workflow";

  await sleep("1 month"); // Sleep will suspend without consuming any resources [!code highlight]

  // Create a webhook for external workflow resumption
  const webhook = createWebhook();

  // Send the webhook url to some external service or in an email, etc.
  await sendHumanApprovalEmail("Click this link to accept the review", webhook.url);

  const data = await webhook; // The workflow suspends till the URL is resumed [!code highlight]

  console.log("Document reviewed!");
}
```

## Writing Workflows

### Basic Structure

The simplest workflow consists of a workflow function and one or more step functions.

```typescript lineNumbers
// Workflow function (orchestrates the steps)
export async function greetingWorkflow(name: string) {
  "use workflow";

  const message = await greet(name);
  return { message };
}

// Step function (does the actual work)
async function greet(name: string) {
  "use step";

  // Access Node.js APIs
  const message = `Hello ${name} at ${new Date().toISOString()}`;
  console.log(message);
  return message;
}
```

### Project structure

While you can organize workflow and step functions however you like, we find that larger projects benefit from some structure:
<Files>
<Folder name="workflows" defaultOpen disabled>
<Folder name="userOnboarding" defaultOpen disabled>
<File name="index.ts" />
<File name="steps.ts" />
</Folder>
<Folder name="aiVideoGeneration" defaultOpen disabled>
<File name="index.ts" />
<Folder name="steps" defaultOpen disabled>
<File name="transcribeUpload.ts" />
<File name="generateVideo.ts" />
<File name="notifyUser.ts" />
</Folder>
</Folder>
<Folder name="shared" defaultOpen disabled>
<File name="validateInput.ts" />
<File name="logActivity.ts" />
</Folder>
</Folder>
</Files>

You can choose to organize your steps into a single `steps.ts` file or separate files within a `steps` folder. The `shared` folder is a good place to put common steps that are used by multiple workflows.

<Callout type="info">
Splitting up steps and workflows will also help avoid most bundler related bugs with the Workflow DevKit.
</Callout>

---

## Streaming

---

## title: Streaming

Workflows can stream data in real-time to clients without waiting for the entire workflow to complete. This enables progress updates, AI-generated content, log messages, and other incremental data to be delivered as workflows execute.

## Getting Started with `getWritable()`

Every workflow run has a default writable stream that steps can write to using [`getWritable()`](/docs/api-reference/workflow/get-writable). Data written to this stream becomes immediately available to clients consuming the workflow's output.

```typescript title="workflows/simple-streaming.ts" lineNumbers
import { getWritable } from "workflow";

async function writeProgress(message: string) {
  "use step";

  // Steps can write to the run's default stream
  const writable = getWritable<string>(); // [!code highlight]
  const writer = writable.getWriter();
  await writer.write(message);
  writer.releaseLock();
}

export async function simpleStreamingWorkflow() {
  "use workflow";

  await writeProgress("Starting task...");
  await writeProgress("Processing data...");
  await writeProgress("Task complete!");
}
```

### Consuming the Stream

Use the `Run` object's `readable` property to consume the stream from your API route:

```typescript title="app/api/stream/route.ts" lineNumbers
import { start } from "workflow/api";
import { simpleStreamingWorkflow } from "./workflows/simple";

export async function POST() {
  const run = await start(simpleStreamingWorkflow);

  // Return the readable stream to the client
  return new Response(run.readable, {
    headers: { "Content-Type": "text/plain" },
  });
}
```

When a client makes a request to this endpoint, they'll receive each message as it's written, without waiting for the workflow to complete.

### Resuming Streams from a Specific Point

Use `run.getReadable({ startIndex })` to resume a stream from a specific position. This is useful for reconnecting after timeouts or network interruptions:

```typescript title="app/api/resume-stream/[runId]/route.ts" lineNumbers
import { getRun } from "workflow/api";

export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const { searchParams } = new URL(request.url);

  // Client provides the last chunk index they received
  const startIndexParam = searchParams.get("startIndex"); // [!code highlight]
  const startIndex = startIndexParam ? parseInt(startIndexParam, 10) : undefined; // [!code highlight]

  const run = getRun(runId);
  const stream = run.getReadable({ startIndex }); // [!code highlight]

  return new Response(stream, {
    headers: { "Content-Type": "text/plain" },
  });
}
```

This allows clients to reconnect and continue receiving data from where they left off, rather than restarting from the beginning.

## Streams as Data Types

[`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) and [`WritableStream`](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream) are standard Web Streams API types that Workflow DevKit makes serializable. These are not custom types - they follow the web standard - but Workflow DevKit adds the ability to pass them between functions while maintaining their streaming capabilities.

Unlike regular values that are fully serialized to the event log, streams maintain their streaming capabilities when passed between functions.

**Key properties:**

- Stream references can be passed between workflow and step functions
- Stream data flows directly without being stored in the event log
- Streams preserve their state across workflow suspension points

<Callout type="info">
**How Streams Persist Across Workflow Suspensions**

Streams in Workflow DevKit are backed by persistent, resumable storage provided by the "world" implementation. This is what enables streams to maintain their state even when workflows suspend and resume:

- **Vercel deployments**: Streams are backed by a performant Redis-based stream
- **Local development**: Stream chunks are stored in the filesystem
  </Callout>

### Passing Streams as Arguments

Since streams are serializable data types, you don't need to use the special [`getWritable()`](/docs/api-reference/workflow/get-writable). You can even wire your own streams through workflows, passing them as arguments from outside into steps.

Here's an example of passing a request body stream through a workflow to a step that processes it:

```typescript title="app/api/upload/route.ts" lineNumbers
import { start } from "workflow/api";
import { streamProcessingWorkflow } from "./workflows/streaming";

export async function POST(request: Request) {
  // Streams can be passed as workflow arguments
  const run = await start(streamProcessingWorkflow, [request.body]); // [!code highlight]
  await run.result();

  return Response.json({ status: "complete" });
}
```

```typescript title="workflows/streaming.ts" lineNumbers
export async function streamProcessingWorkflow(
  inputStream: ReadableStream<Uint8Array> // [!code highlight]
) {
  "use workflow";

  // Workflow passes stream to step for processing
  const result = await processInputStream(inputStream); // [!code highlight]
  return { length: result.length };
}

async function processInputStream(input: ReadableStream<Uint8Array>) {
  "use step";

  // Step reads from the stream
  const chunks: Uint8Array[] = [];

  for await (const chunk of input) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}
```

## Important Limitation

<Callout type="info">
**Streams Cannot Be Used Directly in Workflow Context**

You cannot read from or write to streams directly within a workflow function. All stream operations must happen in step functions.
</Callout>

Workflow functions must be deterministic to support replay. Since streams bypass the event log for performance, reading stream data in a workflow would break determinism - each replay could see different data. By requiring all stream operations to happen in steps, the framework ensures consistent behavior.

For more on determinism and replay, see [Workflows and Steps](/docs/foundations/workflows-and-steps).

```typescript title="workflows/bad-example.ts" lineNumbers
export async function badWorkflow() {
  "use workflow";

  const writable = getWritable<string>();

  // Cannot read/write streams in workflow context
  const writer = writable.getWriter(); // [!code highlight]
  await writer.write("data"); // [!code highlight]
}
```

```typescript title="workflows/good-example.ts" lineNumbers
export async function goodWorkflow() {
  "use workflow";

  // Delegate stream operations to steps
  await writeToStream("data");
}

async function writeToStream(data: string) {
  "use step";

  // Stream operations must happen in steps
  const writable = getWritable<string>();
  const writer = writable.getWriter();
  await writer.write(data);
  writer.releaseLock();
}
```

## Namespaced Streams

Use `getWritable({ namespace: 'name' })` to create multiple independent streams for different types of data. This is useful when you want to separate logs, metrics, data outputs, or other distinct channels.

```typescript title="workflows/multi-stream.ts" lineNumbers
import { getWritable } from "workflow";

type LogEntry = { level: string; message: string };
type MetricEntry = { cpu: number; memory: number };

async function writeLogs() {
  "use step";

  const logs = getWritable<LogEntry>({ namespace: "logs" }); // [!code highlight]
  const writer = logs.getWriter();

  await writer.write({ level: "info", message: "Task started" });
  await writer.write({ level: "info", message: "Processing..." });

  writer.releaseLock();
}

async function writeMetrics() {
  "use step";

  const metrics = getWritable<MetricEntry>({ namespace: "metrics" }); // [!code highlight]
  const writer = metrics.getWriter();

  await writer.write({ cpu: 45, memory: 512 });
  await writer.write({ cpu: 52, memory: 520 });

  writer.releaseLock();
}

async function closeStreams() {
  "use step";

  await getWritable({ namespace: "logs" }).close();
  await getWritable({ namespace: "metrics" }).close();
}

export async function multiStreamWorkflow() {
  "use workflow";

  await writeLogs();
  await writeMetrics();
  await closeStreams();
}
```

### Consuming Namespaced Streams

Use `run.getReadable({ namespace: 'name' })` to access specific streams:

```typescript title="app/api/multi-stream/route.ts" lineNumbers
import { start } from "workflow/api";
import { multiStreamWorkflow } from "./workflows/multi";

type LogEntry = { level: string; message: string };
type MetricEntry = { cpu: number; memory: number };

export async function POST(request: Request) {
  const run = await start(multiStreamWorkflow);

  // Access specific named streams // [!code highlight]
  const logs = run.getReadable<LogEntry>({ namespace: "logs" }); // [!code highlight]
  const metrics = run.getReadable<MetricEntry>({ namespace: "metrics" }); // [!code highlight]

  // Return the logs stream to the client
  return new Response(logs, {
    headers: { "Content-Type": "application/json" },
  });
}
```

## Common Patterns

### Progress Updates for Long-Running Tasks

Send incremental progress updates to keep users informed during lengthy workflows:

```typescript title="workflows/batch-processing.ts" lineNumbers
import { getWritable, sleep } from "workflow";

type ProgressUpdate = {
  item: string;
  progress: number;
  status: string;
};

async function processItem(item: string, current: number, total: number) {
  "use step";

  const writable = getWritable<ProgressUpdate>(); // [!code highlight]
  const writer = writable.getWriter();

  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Send progress update // [!code highlight]
  await writer.write({
    // [!code highlight]
    item, // [!code highlight]
    progress: Math.round((current / total) * 100), // [!code highlight]
    status: "processing", // [!code highlight]
  }); // [!code highlight]

  writer.releaseLock();
}

async function finalizeProgress() {
  "use step";

  await getWritable().close();
}

export async function batchProcessingWorkflow(items: string[]) {
  "use workflow";

  for (let i = 0; i < items.length; i++) {
    await processItem(items[i], i + 1, items.length);
    await sleep("1s");
  }

  await finalizeProgress();
}
```

### Streaming AI Responses with `DurableAgent`

Stream AI-generated content using [`DurableAgent`](/docs/api-reference/workflow-ai/durable-agent) from `@workflow/ai`. Tools can also emit progress updates to the same stream using [data chunks](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data#streaming-custom-data) with the [`UIMessageChunk`](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) type from the AI SDK:

```typescript title="workflows/ai-assistant.ts" lineNumbers
import { DurableAgent } from "@workflow/ai/agent";
import { getWritable } from "workflow";
import { z } from "zod";
import type { UIMessageChunk } from "ai";

async function searchFlights({ query }: { query: string }) {
  "use step";

  // Tools can emit progress updates to the stream
  const writable = getWritable<UIMessageChunk>(); // [!code highlight]
  const writer = writable.getWriter(); // [!code highlight]
  await writer.write({
    // [!code highlight]
    type: "data-progress", // [!code highlight]
    data: { message: `Searching flights for ${query}...` }, // [!code highlight]
    transient: true, // [!code highlight]
  }); // [!code highlight]
  writer.releaseLock(); // [!code highlight]

  // ... search logic ...
  return {
    flights: [
      /* results */
    ],
  };
}

export async function aiAssistantWorkflow(userMessage: string) {
  "use workflow";

  const agent = new DurableAgent({
    model: "anthropic/claude-haiku-4.5",
    system: "You are a helpful flight assistant.",
    tools: {
      searchFlights: {
        description: "Search for flights",
        inputSchema: z.object({ query: z.string() }),
        execute: searchFlights,
      },
    },
  });

  // LLM response will be streamed to the run's writable
  await agent.stream({
    messages: [{ role: "user", content: userMessage }],
    writable: getWritable<UIMessageChunk>(), // [!code highlight]
  });
}
```

```typescript title="app/api/ai-assistant/route.ts" lineNumbers
import { createUIMessageStreamResponse } from "ai";
import { start } from "workflow/api";
import { aiAssistantWorkflow } from "./workflows/ai";

export async function POST(request: Request) {
  const { message } = await request.json();

  const run = await start(aiAssistantWorkflow, [message]);

  return createUIMessageStreamResponse({
    stream: run.readable,
  });
}
```

<Callout type="info">
For a complete implementation, see the [flight booking example](https://github.com/vercel/workflow-examples/tree/main/flight-booking-app) which demonstrates streaming AI responses with tool progress updates.
</Callout>

### Streaming Between Steps

One step produces a stream and another step consumes it:

```typescript title="workflows/stream-pipeline.ts" lineNumbers
export async function streamPipelineWorkflow() {
  "use workflow";

  // Streams can be passed between steps
  const stream = await generateData(); // [!code highlight]
  const results = await consumeData(stream); // [!code highlight]

  return { count: results.length };
}

async function generateData(): Promise<ReadableStream<number>> {
  "use step";

  // Producer step creates a stream
  return new ReadableStream<number>({
    start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(i);
      }
      controller.close();
    },
  });
}

async function consumeData(readable: ReadableStream<number>) {
  "use step";

  // Consumer step reads from the stream
  const values: number[] = [];
  for await (const value of readable) {
    values.push(value);
  }
  return values;
}
```

### Processing Large Files Without Memory Overhead

Process large files by streaming chunks through transformation steps:

```typescript title="workflows/file-processing.ts" lineNumbers
export async function fileProcessingWorkflow(fileUrl: string) {
  "use workflow";

  // Chain streams through multiple processing steps
  const rawStream = await downloadFile(fileUrl); // [!code highlight]
  const processedStream = await transformData(rawStream); // [!code highlight]
  await uploadResult(processedStream); // [!code highlight]
}

async function downloadFile(url: string): Promise<ReadableStream<Uint8Array>> {
  "use step";
  const response = await fetch(url);
  return response.body!;
}

async function transformData(
  input: ReadableStream<Uint8Array>
): Promise<ReadableStream<Uint8Array>> {
  "use step";

  // Transform stream chunks without loading entire file into memory
  return input.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        // Process each chunk individually
        controller.enqueue(chunk);
      },
    })
  );
}

async function uploadResult(stream: ReadableStream<Uint8Array>) {
  "use step";
  await fetch("https://storage.example.com/upload", {
    method: "POST",
    body: stream,
  });
}
```

## Best Practices

**Release locks properly:**

```typescript lineNumbers
const writer = writable.getWriter();
try {
  await writer.write(data);
} finally {
  writer.releaseLock(); // Always release
}
```

<Callout type="info">
Stream locks acquired in a step only apply within that step, not across other steps. This enables multiple writers to write to the same stream concurrently.
</Callout>

<Callout type="warn">
If a lock is not released, the step function's HTTP request cannot terminate. Even though the step returns and the workflow continues, the underlying request will remain active until it times out—wasting compute resources unnecessarily.
</Callout>

**Close streams when done:**

```typescript lineNumbers
async function finalizeStream() {
  "use step";

  await getWritable().close(); // Signal completion
}
```

Streams are automatically closed when the workflow run completes, but explicitly closing them signals completion to consumers earlier.

**Use typed streams for type safety:**

{/_ @skip-typecheck: incomplete code sample _/}

```typescript lineNumbers
const writable = getWritable<MyDataType>();
const writer = writable.getWriter();
await writer.write({
  /* typed data */
});
```

## Stream Failures

When a step returns a stream, the step is considered successful once it returns, even if the stream later encounters an error. The workflow won't automatically retry the step. The consumer of the stream must handle errors gracefully. For more on retry behavior, see [Errors and Retries](/docs/foundations/errors-and-retries).

```typescript title="workflows/stream-error-handling.ts" lineNumbers
import { FatalError } from "workflow";

async function produceStream(): Promise<ReadableStream<number>> {
  "use step";

  // Step succeeds once it returns the stream
  return new ReadableStream<number>({
    start(controller) {
      controller.enqueue(1);
      controller.enqueue(2);
      // Error occurs after step has completed // [!code highlight]
      controller.error(new Error("Stream failed")); // [!code highlight]
    },
  });
}

async function consumeStream(stream: ReadableStream<number>) {
  "use step";

  try {
    // [!code highlight]
    for await (const value of stream) {
      console.log(value);
    }
  } catch (error) {
    // [!code highlight]
    // Retrying won't help since the stream is already errored // [!code highlight]
    throw new FatalError("Stream failed"); // [!code highlight]
  } // [!code highlight]
}

export async function streamErrorWorkflow() {
  "use workflow";

  const stream = await produceStream(); // Step succeeds // [!code highlight]
  await consumeStream(stream); // Consumer handles errors // [!code highlight]
}
```

<Callout type="info">
Stream errors don't trigger automatic retries for the producer step. Design your stream consumers to handle errors appropriately. Since the stream is already in an errored state, retrying the consumer won't help - use `FatalError` to fail the workflow immediately.
</Callout>

## Related Documentation

- [`getWritable()` API Reference](/docs/api-reference/workflow/get-writable) - Get the workflow's writable stream
- [`sleep()` API Reference](/docs/api-reference/workflow/sleep) - Pause workflow execution for a duration
- [`start()` API Reference](/docs/api-reference/workflow-api/start) - Start workflows and access the `Run` object
- [`getRun()` API Reference](/docs/api-reference/workflow-api/get-run) - Retrieve runs and their streams later
- [DurableAgent](/docs/api-reference/workflow-ai/durable-agent) - AI agents with built-in streaming support
- [Errors and Retries](/docs/foundations/errors-and-retries) - Understanding error handling and retry behavior
- [Serialization](/docs/foundations/serialization) - Understanding what data types can be passed in workflows
- [Workflows and Steps](/docs/foundations/workflows-and-steps) - Core concepts of workflow execution

---

## Errors and Retries

---

## title: Errors & Retrying

By default, errors thrown inside steps are retried. Additionally, Workflow DevKit provides two new types of errors you can use to customize retries.

## Default Retrying

By default, steps retry up to 3 times on arbitrary errors. You can customize the number of retries by adding a `maxRetries` property to the step function.

```typescript lineNumbers
async function callApi(endpoint: string) {
  "use step";

  const response = await fetch(endpoint);

  if (response.status >= 500) {
    // Any uncaught error gets retried
    throw new Error("Uncaught exceptions get retried!"); // [!code highlight]
  }

  return response.json();
}

callApi.maxRetries = 5; // Retry up to 5 times on failure (6 total attempts)
```

Steps get enqueued immediately after a failure. Read on to see how this can be customized.

<Callout type="info">
  When a retried step performs external side effects (payments, emails, API
  writes), ensure those calls are <strong>idempotent</strong> to avoid duplicate
  side effects. See <a href="/docs/foundations/idempotency">Idempotency</a> for
  more information.
</Callout>

## Intentional Errors

When your step needs to intentionally throw an error and skip retrying, simply throw a [`FatalError`](/docs/api-reference/workflow/fatal-error).

```typescript lineNumbers
import { FatalError } from "workflow";

async function callApi(endpoint: string) {
  "use step";

  const response = await fetch(endpoint);

  if (response.status >= 500) {
    // Any uncaught error gets retried
    throw new Error("Uncaught exceptions get retried!");
  }

  if (response.status === 404) {
    throw new FatalError("Resource not found. Skipping retries."); // [!code highlight]
  }

  return response.json();
}
```

## Customize Retry Behavior

When you need to customize the delay on a retry, use [`RetryableError`](/docs/api-reference/workflow/retryable-error) and set the `retryAfter` property.

```typescript lineNumbers
import { FatalError, RetryableError } from "workflow";

async function callApi(endpoint: string) {
  "use step";

  const response = await fetch(endpoint);

  if (response.status >= 500) {
    throw new Error("Uncaught exceptions get retried!");
  }

  if (response.status === 404) {
    throw new FatalError("Resource not found. Skipping retries.");
  }

  if (response.status === 429) {
    throw new RetryableError("Rate limited. Retrying...", {
      // [!code highlight]
      retryAfter: "1m", // Duration string // [!code highlight]
    }); // [!code highlight]
  }

  return response.json();
}
```

## Advanced Example

This final example combines everything we've learned, along with [`getStepMetadata`](/docs/api-reference/workflow/get-step-metadata).

```typescript lineNumbers
import { FatalError, RetryableError, getStepMetadata } from "workflow";

async function callApi(endpoint: string) {
  "use step";

  const metadata = getStepMetadata();

  const response = await fetch(endpoint);

  if (response.status >= 500) {
    // Exponential backoffs
    throw new RetryableError("Backing off...", {
      retryAfter: metadata.attempt ** 2 * 1000, // [!code highlight]
    });
  }

  if (response.status === 404) {
    throw new FatalError("Resource not found. Skipping retries.");
  }

  if (response.status === 429) {
    throw new RetryableError("Rate limited. Retrying...", {
      retryAfter: new Date(Date.now() + 60000), // Date instance // [!code highlight]
    });
  }

  return response.json();
}
callApi.maxRetries = 5; // Retry up to 5 times on failure (6 total attempts)
```

<Callout type="info">
  Setting <code>maxRetries = 0</code> means the step will run once but will not
  be retried on failure. The default is <code>maxRetries = 3</code>, meaning the
  step can run up to 4 times total (1 initial attempt + 3 retries).
</Callout>

## Rolling Back Failed Steps

When a workflow fails partway through, it can leave the system in an inconsistent state.
A common pattern to address this is "rollbacks": for each successful step, record a corresponding rollback action that can undo it.
If a later step fails, run the rollbacks in reverse order to roll back.

Key guidelines:

- Make rollbacks steps as well, so they are durable and benefit from retries.
- Ensure rollbacks are [idempotent](/docs/foundations/idempotency); they may run more than once.
- Only enqueue a compensation after its forward step succeeds.

```typescript lineNumbers
// Forward steps
async function reserveInventory(orderId: string) {
  "use step";
  // ... call inventory service to reserve ...
}

async function chargePayment(orderId: string) {
  "use step";
  // ... charge the customer ...
}

// Rollback steps
async function releaseInventory(orderId: string) {
  "use step";
  // ... undo inventory reservation ...
}

async function refundPayment(orderId: string) {
  "use step";
  // ... refund the charge ...
}

export async function placeOrderSaga(orderId: string) {
  "use workflow";

  const rollbacks: Array<() => Promise<void>> = [];

  try {
    await reserveInventory(orderId);
    rollbacks.push(() => releaseInventory(orderId));

    await chargePayment(orderId);
    rollbacks.push(() => refundPayment(orderId));

    // ... more steps & rollbacks ...
  } catch (e) {
    for (const rollback of rollbacks.reverse()) {
      await rollback();
    }
    // Rethrow so the workflow records the failure after rollbacks
    throw e;
  }
}
```
