#!/usr/bin/env bun

/**
 * ai-kiro-kit init
 *
 * Scaffolds Kiro config files into a target project.
 *
 * Deployment model:
 *   templates/  → .kiro/steering/  (.md files, never-overwrite)
 *   skills/     → .kiro/skills/    (excludes scope: global, never-overwrite)
 *   agents/     → .kiro/agents/    (.json files, never-overwrite)
 *   hooks/      → .kiro/hooks/     (.sh files, chmod 755, never-overwrite)
 *   AGENTS.md   → <target>/AGENTS.md  (create if missing; skip if exists)
 *
 * No interactive prompts — teams fill in steering files manually.
 * Running init twice in the same project is a no-op.
 */

import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { readFrontmatterValue } from "./lib/frontmatter";

type FileAction = "created" | "skipped";

type ScaffoldResult = {
  path: string;
  action: FileAction;
};

const kitRoot = resolve(import.meta.dir, "..");

const writeIfMissing = (path: string, content: string): FileAction => {
  if (existsSync(path)) return "skipped";
  writeFileSync(path, content, "utf-8");
  return "created";
};

const scaffoldSteering = (targetDir: string): ScaffoldResult[] => {
  const srcDir = join(kitRoot, "templates");
  const destDir = join(targetDir, ".kiro", "steering");
  if (!existsSync(srcDir)) return [];
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

  return readdirSync(srcDir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const destPath = join(destDir, file);
      const action = writeIfMissing(destPath, readFileSync(join(srcDir, file), "utf-8"));
      return { path: destPath, action };
    });
};

const scaffoldSkillDir = (srcSkillDir: string, destSkillDir: string): ScaffoldResult[] => {
  if (!existsSync(destSkillDir)) mkdirSync(destSkillDir, { recursive: true });

  return readdirSync(srcSkillDir).flatMap((file) => {
    const srcPath = join(srcSkillDir, file);
    if (statSync(srcPath).isDirectory()) return [];
    const destPath = join(destSkillDir, file);
    const action = writeIfMissing(destPath, readFileSync(srcPath, "utf-8"));
    return [{ path: destPath, action }];
  });
};

const scaffoldSkills = (targetDir: string): ScaffoldResult[] => {
  const srcDir = join(kitRoot, "skills");
  const destDir = join(targetDir, ".kiro", "skills");
  if (!existsSync(srcDir)) return [];
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

  return readdirSync(srcDir).flatMap((entry) => {
    const srcSkillDir = join(srcDir, entry);
    if (!statSync(srcSkillDir).isDirectory()) return [];

    const skillMdPath = join(srcSkillDir, "SKILL.md");
    if (existsSync(skillMdPath)) {
      const content = readFileSync(skillMdPath, "utf-8");
      if (readFrontmatterValue(content, "scope") === "global") return [];
    }

    return scaffoldSkillDir(srcSkillDir, join(destDir, entry));
  });
};

const scaffoldFlatFiles = (
  srcDir: string,
  destDir: string,
  ext: string,
  executable = false,
): ScaffoldResult[] => {
  if (!existsSync(srcDir)) return [];
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

  return readdirSync(srcDir)
    .filter((f) => f.endsWith(ext))
    .map((file) => {
      const srcPath = join(srcDir, file);
      const destPath = join(destDir, file);
      const action = writeIfMissing(destPath, readFileSync(srcPath, "utf-8"));
      if (action === "created" && executable) chmodSync(destPath, 0o755);
      return { path: destPath, action };
    });
};

const scaffoldAgents = (targetDir: string): ScaffoldResult[] =>
  scaffoldFlatFiles(join(kitRoot, "agents"), join(targetDir, ".kiro", "agents"), ".json");

const scaffoldHooks = (targetDir: string): ScaffoldResult[] =>
  scaffoldFlatFiles(join(kitRoot, "hooks"), join(targetDir, ".kiro", "hooks"), ".sh", true);

const scaffoldAgentsMd = (targetDir: string): ScaffoldResult => {
  const destPath = join(targetDir, "AGENTS.md");
  if (existsSync(destPath)) {
    console.log(`  Note: AGENTS.md already exists at ${destPath} — Kiro will auto-include it.\n`);
    return { path: destPath, action: "skipped" };
  }

  const content = [
    "# AGENTS.md",
    "",
    "This project uses Kiro for AI-assisted development. Primary steering lives in `.kiro/steering/`.",
    "Skills are imported from ai-kiro-kit. Custom agents are in `.kiro/agents/`.",
    "",
    "Always read `.kiro/steering/context.md` at the start of a session before doing anything else.",
    "",
  ].join("\n");

  writeFileSync(destPath, content, "utf-8");
  return { path: destPath, action: "created" };
};

const printResult = (results: ScaffoldResult[]): void => {
  const icon: Record<FileAction, string> = { created: "✓", skipped: "–" };

  console.log("\nScaffolded:\n");
  for (const { path, action } of results) {
    const rel = path.startsWith(process.cwd()) ? path.slice(process.cwd().length + 1) : path;
    console.log(`  ${icon[action]} ${rel}  (${action})`);
  }

  console.log(`
Legend: ✓ created  – already present, skipped

Next steps:
  1. Fill in the TODOs in .kiro/steering/product.md, structure.md, and tech.md
  2. Update .kiro/steering/context.md with your current focus
  3. Run \`kiro\` in this directory to start a session
`);
};

const main = (): void => {
  const targetDir = resolve(process.argv[2] ?? ".");

  console.log("\nai-kiro-kit init\n");
  console.log(`Target: ${targetDir}\n`);

  const results: ScaffoldResult[] = [
    scaffoldAgentsMd(targetDir),
    ...scaffoldSteering(targetDir),
    ...scaffoldSkills(targetDir),
    ...scaffoldAgents(targetDir),
    ...scaffoldHooks(targetDir),
  ];

  printResult(results);
};

main();
