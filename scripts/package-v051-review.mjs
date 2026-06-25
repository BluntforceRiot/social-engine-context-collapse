import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const release = normalizeRelease(process.argv[2] ?? "v051");
const suffix = release.toUpperCase();
const titleVersion = release === "v100" ? "v1.0" : "v0.5.1";
const tmpRoot = path.join(root, `.tmp-review-${release}`);
const stageDir = path.join(tmpRoot, "package");
const extractDir = path.join(tmpRoot, "extract");
const zipPath = path.join(root, `social-engine-${release}-review.zip`);
const verifyReportPath = path.join(root, `PACKAGE_VERIFY_SOCIAL_ENGINE_${suffix}.md`);

const includePaths = [
  ".github",
  "docs",
  "public",
  "scripts",
  "src",
  `output/social-engine-${release}`,
  ".gitignore",
  "index.html",
  "LICENSE",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  `BUILD_RECEIPT_SOCIAL_ENGINE_${suffix}.md`,
  `BUILD_LOG_SOCIAL_ENGINE_${suffix}.txt`,
  `BALANCE_REPORT_SOCIAL_ENGINE_${suffix}.md`,
  `PLAYTEST_REPORT_SOCIAL_ENGINE_${suffix}.md`,
];

if (release === "v100") {
  includePaths.push(`REGRESSION_REPORT_SOCIAL_ENGINE_${suffix}.md`);
}

const requiredFiles = [
  "package.json",
  "package-lock.json",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "src/main.ts",
  "src/sim.ts",
  "public/assets/qwen-franklin-avatar.svg",
  "docs/submission/COMPETITOR_REFERENCE_QWEN_FRANKLIN.md",
  `BUILD_RECEIPT_SOCIAL_ENGINE_${suffix}.md`,
  `BUILD_LOG_SOCIAL_ENGINE_${suffix}.txt`,
  `BALANCE_REPORT_SOCIAL_ENGINE_${suffix}.md`,
  `PLAYTEST_REPORT_SOCIAL_ENGINE_${suffix}.md`,
];

if (release === "v100") {
  requiredFiles.push(`REGRESSION_REPORT_SOCIAL_ENGINE_${suffix}.md`);
}

try {
  await rm(tmpRoot, { recursive: true, force: true });
  await rm(zipPath, { force: true });
  await mkdir(stageDir, { recursive: true });

  for (const relativePath of includePaths) {
    const source = path.join(root, relativePath);
    if (!existsSync(source)) {
      throw new Error(`Missing package input: ${relativePath}`);
    }
    await cp(source, path.join(stageDir, relativePath), { recursive: true });
  }

  run("tar", ["-a", "-cf", zipPath, "-C", stageDir, "."]);

  const list = run("tar", ["-tf", zipPath]).stdout.split(/\r?\n/).filter(Boolean);
  const backslashEntries = list.filter((entry) => entry.includes("\\"));
  if (backslashEntries.length) {
    throw new Error(`Zip contains backslash entries:\n${backslashEntries.join("\n")}`);
  }

  await mkdir(extractDir, { recursive: true });
  run("tar", ["-xf", zipPath, "-C", extractDir]);

  for (const relativePath of requiredFiles) {
    if (!existsSync(path.join(extractDir, relativePath))) {
      throw new Error(`Extracted package missing required file: ${relativePath}`);
    }
  }

  const ci = run("npm", ["ci"], { cwd: extractDir });
  const typecheck = run("npm", ["run", "typecheck"], { cwd: extractDir });
  const build = run("npm", ["run", "build"], { cwd: extractDir });

  const report = [
    `# Social Engine ${titleVersion} Package Verification`,
    "",
    `Generated: ${new Date().toISOString()}`,
    `Zip: ${zipPath}`,
    "Verification report placement: adjacent to the zip, not inside it, so the exact final archive is the archive extracted and rebuilt.",
    "",
    "## Entry Inspection",
    "",
    `Entries inspected: ${list.length}`,
    "Backslash entries: 0",
    "",
    "## Required Files",
    "",
    ...requiredFiles.map((file) => `- PASS: ${file}`),
    "",
    "## Extracted Package Commands",
    "",
    `- PASS: npm ci (${ci.status})`,
    `- PASS: npm run typecheck (${typecheck.status})`,
    `- PASS: npm run build (${build.status})`,
    "",
  ].join("\n");

  await writeFile(verifyReportPath, report, "utf8");

  console.log(report);
} finally {
  await rm(tmpRoot, { recursive: true, force: true });
}

function normalizeRelease(value) {
  const normalized = value.toLowerCase().replace(/^--/, "").replace(/^v?/, "v");
  if (normalized !== "v051" && normalized !== "v100") {
    throw new Error(`Unsupported review package release: ${value}`);
  }
  return normalized;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    shell: process.platform === "win32" && command === "npm",
    maxBuffer: 1024 * 1024 * 20,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
  return result;
}
