import { readFile } from "node:fs/promises";
import path from "node:path";

const suffix = normalizeSuffix(process.argv[2] ?? "V051");
const receiptPath = path.resolve(`BUILD_RECEIPT_SOCIAL_ENGINE_${suffix}.md`);
const text = await readFile(receiptPath, "utf8");
const failures = [];

for (const token of ["$root", "$branch", "$commit", "$created"]) {
  if (text.includes(token)) {
    failures.push(`Found unresolved placeholder token ${token}`);
  }
}

if (/^pm\s/m.test(text)) {
  failures.push("Found a line beginning with `pm ` where `npm ` was likely intended");
}

if (text.includes("\u0000")) {
  failures.push("Found NUL characters");
}

const fenceCount = (text.match(/```/g) ?? []).length;
if (fenceCount % 2 !== 0) {
  failures.push("Malformed fenced code block count");
}

if (!/Project path:\s+\S+/i.test(text)) {
  failures.push("Missing concrete project path");
}

if (!/Branch:\s+\S+/i.test(text)) {
  failures.push("Missing concrete branch");
}

if (!/Commit:\s+[0-9a-f]{40}/i.test(text)) {
  failures.push("Missing full 40-character commit hash");
}

if (suffix === "V100" && !/Source commit:\s+[0-9a-f]{40}/i.test(text)) {
  failures.push("Missing final source commit hash");
}

if (suffix === "V100" && !/Tracked working tree:\s+clean/i.test(text)) {
  failures.push("Missing clean tracked-tree statement");
}

if (!/Generated:\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i.test(text)) {
  failures.push("Missing ISO-like generated timestamp");
}

if (!text.includes("npm run typecheck") || !text.includes("npm run build") || !text.includes("npm audit --audit-level=moderate")) {
  failures.push("Missing exact verification commands");
}

if (failures.length) {
  console.error(["Receipt validation failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exit(1);
}

console.log(`Receipt validation passed: ${receiptPath}`);

function normalizeSuffix(value) {
  const suffix = value.toUpperCase().replace(/^--?V?/, "V");
  if (suffix !== "V051" && suffix !== "V100") {
    throw new Error(`Unsupported receipt suffix: ${value}`);
  }
  return suffix;
}
