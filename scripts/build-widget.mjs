#!/usr/bin/env node

import * as esbuild from "esbuild";
import { gzipSync } from "zlib";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

// Ensure output directory exists
const outDir = join(ROOT_DIR, "public", "widget");
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

async function build() {
  const startTime = Date.now();
  console.log("Building widget bundle...\n");

  try {
    // Build the widget bundle
    const result = await esbuild.build({
      entryPoints: [join(ROOT_DIR, "src", "widget", "index.tsx")],
      bundle: true,
      minify: true,
      format: "iife",
      target: ["es2020", "chrome80", "firefox78", "safari14", "edge88"],
      outfile: join(outDir, "chat.js"),
      jsx: "automatic",
      jsxImportSource: "react",
      // Bundle React into the widget to make it self-contained
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      // External nothing - bundle everything
      external: [],
      // Tree shaking and dead code elimination
      treeShaking: true,
      // Generate source map for debugging (can be disabled in production)
      sourcemap: false,
      // Metafile for bundle analysis
      metafile: true,
      // Ensure the bundle is wrapped to avoid polluting global scope
      globalName: "__ChatWidgetBundle",
      // Legal comments to external file
      legalComments: "none",
    });

    // Read the output file
    const outputPath = join(outDir, "chat.js");
    const bundleContent = readFileSync(outputPath, "utf-8");
    const bundleSize = Buffer.byteLength(bundleContent, "utf-8");
    const gzippedSize = gzipSync(bundleContent).length;

    // Log build results
    console.log("✓ Widget bundle built successfully!\n");
    console.log(`  Output: public/widget/chat.js`);
    console.log(`  Size: ${formatBytes(bundleSize)}`);
    console.log(`  Gzipped: ${formatBytes(gzippedSize)}`);
    console.log(`  Time: ${Date.now() - startTime}ms\n`);

    // Write metafile for bundle analysis
    writeFileSync(
      join(outDir, "meta.json"),
      JSON.stringify(result.metafile, null, 2)
    );

    // Print usage instructions
    console.log("Usage:");
    console.log("  Add this script tag to embed the widget:\n");
    console.log(
      `  <script src="https://your-domain.com/widget/chat.js" data-agent-id="YOUR_AGENT_ID"></script>\n`
    );
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

build();
