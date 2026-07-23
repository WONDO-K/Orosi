import { spawnSync } from "node:child_process";
import process from "node:process";

const result = spawnSync("java", ["-version"], {
  encoding: "utf8",
  windowsHide: true,
});
const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const match = output.match(/version "(\d+)(?:\.\d+)?/);

if (result.error || !match) {
  process.stderr.write(
    "JDK 21 required; Java was not found or its version could not be read.\n",
  );
  process.exit(1);
}

const major = Number(match[1]);
if (major !== 21) {
  process.stderr.write(
    `JDK 21 required; found ${major}. Select a JDK 21 JAVA_HOME before Android builds.\n`,
  );
  process.exit(1);
}

process.stdout.write("Native toolchain preflight passed: JDK 21.\n");
