#!/usr/bin/env bun

/**
 * ai-kiro-kit install-global
 *
 * Deploys skills/, agents/, hooks/, and steering templates to ~/.kiro/.
 *
 * Deployment model:
 *   skills/     → ~/.kiro/skills/    (all skills, as directories)
 *   agents/     → ~/.kiro/agents/    (.json files)
 *   hooks/      → ~/.kiro/hooks/     (.sh files, chmod 755)
 *   templates/  → ~/.kiro/steering/  (.md files, never-overwrite)
 *
 * Existing files are never overwritten — preserves hand-edits in ~/.kiro/.
 *
 * Records SHA256 checksums of every deployed file in ~/.kiro/.kiro-kit-checksums.
 */

import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";
import { checksumsPath, type Checksums, readChecksums, withHash, writeChecksums } from "./lib/checksums";

type FileAction = "created" | "skipped";

type InstallResult = {
  path: string;
  action: FileAction;
  content: string;
};

const kitRoot = resolve(import.meta.dir, "..");
const kiroHome = join(homedir(), ".kiro");

const installSkillDir = (srcSkillDir: string, destSkillDir: string): InstallResult[] => {
  if (!existsSync(destSkillDir)) mkdirSync(destSkillDir, { recursive: true });

  return readdirSync(srcSkillDir).flatMap((file) => {
    const srcPath = join(srcSkillDir, file);
    if (statSync(srcPath).isDirectory()) return [];

    const destPath = join(destSkillDir, file);
    const content = readFileSync(srcPath, "utf-8");

    if (existsSync(destPath)) {
      return [{ path: destPath, action: "skipped" as FileAction, content: readFileSync(destPath, "utf-8") }];
    }

    writeFileSync(destPath, content, "utf-8");
    return [{ path: destPath, action: "created" as FileAction, content }];
  });
};

const installSkills = (): InstallResult[] => {
  const srcDir = join(kitRoot, "skills");
  const destDir = join(kiroHome, "skills");
  if (!existsSync(srcDir)) return [];
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

  return readdirSync(srcDir).flatMap((entry) => {
    const srcSkillDir = join(srcDir, entry);
    if (!statSync(srcSkillDir).isDirectory()) return [];
    return installSkillDir(srcSkillDir, join(destDir, entry));
  });
};

const installFlatFiles = (
  srcDir: string,
  destDir: string,
  ext: string,
  executable = false,
): InstallResult[] => {
  if (!existsSync(srcDir)) return [];
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

  return readdirSync(srcDir)
    .filter((f) => f.endsWith(ext))
    .map((file) => {
      const srcPath = join(srcDir, file);
      const destPath = join(destDir, file);
      const content = readFileSync(srcPath, "utf-8");

      if (existsSync(destPath)) {
        return { path: destPath, action: "skipped" as FileAction, content: readFileSync(destPath, "utf-8") };
      }

      writeFileSync(destPath, content, "utf-8");
      if (executable) chmodSync(destPath, 0o755);
      return { path: destPath, action: "created" as FileAction, content };
    });
};

const installAgents = (): InstallResult[] =>
  installFlatFiles(join(kitRoot, "agents"), join(kiroHome, "agents"), ".json");

const installHooks = (): InstallResult[] =>
  installFlatFiles(join(kitRoot, "hooks"), join(kiroHome, "hooks"), ".sh", true);

// Deploys steering templates to ~/.kiro/steering/ — generic defaults teams can customize.
// Never-overwrite: user customizations survive re-runs.
const installSteering = (): InstallResult[] =>
  installFlatFiles(join(kitRoot, "templates"), join(kiroHome, "steering"), ".md");

const printResults = (results: InstallResult[]): void => {
  const icon: Record<FileAction, string> = { created: "✓", skipped: "–" };

  console.log("\nInstalled:\n");
  for (const { path, action } of results) {
    console.log(`  ${icon[action]} ${path}  (${action})`);
  }

  console.log("\nLegend: ✓ created  – already present, skipped\n");
};

const recordChecksums = (results: InstallResult[]): void => {
  const existing = readChecksums(checksumsPath);
  const updated = results
    .filter(({ action }) => action !== "skipped")
    .reduce<Checksums>(
      (acc, { path, content }) => withHash(acc, path, content),
      existing,
    );
  writeChecksums(checksumsPath, updated);
};

const main = (): void => {
  if (!existsSync(kiroHome)) mkdirSync(kiroHome, { recursive: true });

  console.log("\nai-kiro-kit install-global\n");
  console.log(`Target: ${kiroHome}\n`);

  const results: InstallResult[] = [
    ...installSkills(),
    ...installAgents(),
    ...installHooks(),
    ...installSteering(),
  ];

  printResults(results);
  recordChecksums(results);
};

main();
