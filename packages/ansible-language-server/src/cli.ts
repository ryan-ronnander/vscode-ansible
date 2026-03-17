#!/usr/bin/env node
import process from "node:process";
import { generateSettingsDocs } from "@src/settings-doc-generator";

declare const PACKAGE_VERSION: string;

const args = new Set(process.argv.slice(2));

if (args.has("--version")) {
  console.log(PACKAGE_VERSION);
  process.exit(0);
} else if (args.has("--generate-docs")) {
  const outputPath = process.argv[process.argv.indexOf("--generate-docs") + 1];
  if (!outputPath || outputPath.startsWith("--")) {
    console.error(
      "Usage: ansible-language-server --generate-docs <output-md-file>",
    );
    process.exit(1);
  }
  generateSettingsDocs(outputPath);
  process.exit(0);
}

import("./server.js").catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
