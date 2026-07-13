import { access, copyFile, mkdir } from "node:fs/promises";

try {
  await access("dist/server/index.js");
} catch {
  try {
    await copyFile("dist/server/index.mjs", "dist/server/index.js");
  } catch {
    await copyFile("dist/server/server.js", "dist/server/index.js");
  }
}

await mkdir("dist/.openai", { recursive: true });
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
