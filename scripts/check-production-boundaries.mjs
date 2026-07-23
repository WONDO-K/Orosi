import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import process from "node:process";

const violations = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (path.replaceAll("\\", "/").endsWith("/src/test")) continue;
      await scan(path);
      continue;
    }
    if (
      ![".ts", ".tsx", ".js", ".mjs"].includes(extname(path)) ||
      /\.test\.[^.]+$/.test(path)
    ) {
      continue;
    }
    const source = await readFile(path, "utf8");
    if (source.includes("@/test/")) {
      violations.push(`${path}: imports test-only code`);
    }
    if (/service[_-]?role/i.test(source)) {
      violations.push(`${path}: contains a service-role identifier`);
    }
    if (/ca-app-pub-\d+/i.test(source)) {
      violations.push(`${path}: contains an operational ad id`);
    }
  }
}

await scan("src");
if (violations.length) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("Production boundary check passed.\n");
