import { join, resolve } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync, readdirSync, copyFileSync } from "fs";

type Manifest = {
  readonly source: string;
  readonly skills: readonly string[];
};

type SyncResult =
  | { readonly kind: "copied"; readonly sha: string }
  | { readonly kind: "skipped"; readonly reason: string }
  | { readonly kind: "error"; readonly message: string };

const expandTilde = (p: string): string =>
  p.startsWith("~/") ? join(homedir(), p.slice(2)) : p;

const resolveSource = (manifest: Manifest, cliArg?: string): string =>
  expandTilde(cliArg ?? manifest.source);

const readManifest = async (manifestPath: string): Promise<Manifest> => {
  const file = Bun.file(manifestPath);
  if (!(await file.exists())) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  return file.json() as Promise<Manifest>;
};

const readFrontmatter = async (skillMdPath: string): Promise<Record<string, string>> => {
  const file = Bun.file(skillMdPath);
  if (!(await file.exists())) return {};
  const text = await file.text();
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  return Object.fromEntries(
    match[1]
      .split("\n")
      .filter((line) => line.includes(":"))
      .map((line) => {
        const idx = line.indexOf(":");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
};

const getSkillSha = async (sourceRoot: string, skillName: string): Promise<string> => {
  const proc = Bun.spawn(
    ["git", "-C", sourceRoot, "log", "-1", "--format=%H", "--", `skills/${skillName}/`],
    { stdout: "pipe", stderr: "pipe" }
  );
  await proc.exited;
  const sha = (await new Response(proc.stdout).text()).trim();
  return sha || "unknown";
};

const copyDir = (src: string, dest: string): void => {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.isFile()) {
      copyFileSync(join(src, entry.name), join(dest, entry.name));
    }
  }
};

const writeSkillSource = async (
  destDir: string,
  sha: string,
  sourceRoot: string,
  skillName: string
): Promise<void> => {
  const content = [
    `sha: ${sha}`,
    `source: ${sourceRoot}/skills/${skillName}`,
    `synced: ${new Date().toISOString()}`,
  ].join("\n") + "\n";
  await Bun.write(join(destDir, ".skill-source"), content);
};

const syncSkill = async (
  skillName: string,
  sourceRoot: string,
  destRoot: string
): Promise<SyncResult> => {
  const srcDir = join(sourceRoot, "skills", skillName);
  const skillMdPath = join(srcDir, "SKILL.md");

  if (!existsSync(srcDir)) {
    return { kind: "error", message: `Source directory not found: ${srcDir}` };
  }

  const frontmatter = await readFrontmatter(skillMdPath);
  if (frontmatter["scope"] === "global") {
    return { kind: "skipped", reason: "scope: global" };
  }

  const sha = await getSkillSha(sourceRoot, skillName);
  const destDir = join(destRoot, "skills", skillName);

  copyDir(srcDir, destDir);
  await writeSkillSource(destDir, sha, sourceRoot, skillName);

  return { kind: "copied", sha };
};

const main = async (): Promise<void> => {
  const scriptDir = resolve(import.meta.dir, "..");
  const manifestPath = join(scriptDir, "scripts", "skills-manifest.json");
  const destRoot = scriptDir;

  const cliSourceArg = process.argv.find((_, i, arr) => arr[i - 1] === "--source");
  const manifest = await readManifest(manifestPath);
  const sourceRoot = resolveSource(manifest, cliSourceArg);

  if (!existsSync(sourceRoot)) {
    console.error(`ai-dev-kit source not found: ${sourceRoot}`);
    console.error(`Pass a path with: bun sync-skills.ts --source /path/to/ai-dev-kit`);
    process.exit(1);
  }

  console.log(`Source: ${sourceRoot}`);
  console.log(`Syncing ${manifest.skills.length} skills...\n`);

  const results = await Promise.all(
    manifest.skills.map(async (skill) => {
      const result = await syncSkill(skill, sourceRoot, destRoot);
      return { skill, result } as const;
    })
  );

  const copied = results.filter((r) => r.result.kind === "copied");
  const skipped = results.filter((r) => r.result.kind === "skipped");
  const errors = results.filter((r) => r.result.kind === "error");

  for (const { skill, result } of copied) {
    const sha = result.kind === "copied" ? result.sha.slice(0, 8) : "";
    console.log(`  ✓ ${skill} (${sha})`);
  }
  for (const { skill, result } of skipped) {
    const reason = result.kind === "skipped" ? result.reason : "";
    console.log(`  — ${skill} (skipped: ${reason})`);
  }
  for (const { skill, result } of errors) {
    const msg = result.kind === "error" ? result.message : "";
    console.error(`  ✗ ${skill}: ${msg}`);
  }

  console.log(`\nDone: ${copied.length} copied, ${skipped.length} skipped, ${errors.length} errors`);

  if (errors.length > 0) process.exit(1);
};

main();
