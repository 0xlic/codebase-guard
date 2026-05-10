#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline/promises");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const SKILL_NAME = "codebase-guard";
const MANAGED_START = "<!-- codebase-guard:start -->";
const MANAGED_END = "<!-- codebase-guard:end -->";
const DEFAULT_LANG = "en";
const SUPPORTED_LANGS = ["zh-CN", "en"];

const TOOL_TARGETS = {
  codex: {
    label: "Codex",
    file: "AGENTS.md",
    skillDir: path.join(".agents", "skills", SKILL_NAME),
  },
  claude: {
    label: "Claude Code",
    file: "CLAUDE.md",
    skillDir: path.join(".claude", "skills", SKILL_NAME),
  },
  trae: {
    label: "Trae",
    file: path.join(".trae", "project_rules.md"),
    skillDir: path.join(".trae", "skills", SKILL_NAME),
  },
};

function usage() {
  console.log(`Usage:
  codebase-guard init [--tools LIST] [--lang zh-CN|en] [--project-dir DIR]
  codebase-guard update [--tools LIST] [--lang zh-CN|en] [--project-dir DIR]
  codebase-guard status [--tools LIST] [--project-dir DIR]
  codebase-guard install-skill [--skills-dir DIR]
  codebase-guard update-skill [--skills-dir DIR]

Commands:
  init          Install project skills and create or replace selected project instruction snippets.
  update        Update project skills and replace selected project instruction snippets.
  status        Print project instruction status.
  install-skill Install or overwrite SKILL.md in the global skills directory.
  update-skill  Remove the installed SKILL.md, then reinstall it.

Options:
  --tools LIST     Comma-separated tools: codex,claude,trae,all. Prompts in an interactive terminal when omitted for init/update.
  --lang LANG      Project instruction language: en or zh-CN. Defaults to en.
  --skills-dir DIR Skills root. Defaults to CODEBASE_GUARD_SKILLS_DIR, CODEX_HOME/skills, or ~/.codex/skills.
  --project-dir DIR Project root. Defaults to the current working directory.
`);
}

function parseArgs(argv) {
  const args = {
    command: argv[2],
    skillsDir: process.env.CODEBASE_GUARD_SKILLS_DIR || null,
    projectDir: process.cwd(),
    tools: null,
    lang: DEFAULT_LANG,
  };

  if (!args.skillsDir && process.env.CODEX_HOME) {
    args.skillsDir = path.join(process.env.CODEX_HOME, "skills");
  }
  if (!args.skillsDir) {
    args.skillsDir = path.join(os.homedir(), ".codex", "skills");
  }

  if (args.command === "-h" || args.command === "--help") {
    args.command = "help";
  }

  for (let index = 3; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--tools") {
      args.tools = normalizeTools(requireValue(argv, index, arg));
      index += 1;
    } else if (arg === "--lang") {
      args.lang = normalizeLang(requireValue(argv, index, arg));
      index += 1;
    } else if (arg === "--skills-dir") {
      args.skillsDir = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === "--project-dir") {
      args.projectDir = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === "-h" || arg === "--help") {
      args.command = "help";
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  args.skillsDir = path.resolve(args.skillsDir);
  args.projectDir = path.resolve(args.projectDir);
  return args;
}

function normalizeLang(rawLang) {
  const lang = rawLang.trim();
  if (!SUPPORTED_LANGS.includes(lang)) {
    throw new Error(`Unknown language '${rawLang}'. Expected one of: ${SUPPORTED_LANGS.join(",")}`);
  }
  return lang;
}

function requireValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function normalizeTools(rawTools) {
  const raw = rawTools
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (raw.length === 0) {
    throw new Error("--tools requires at least one tool");
  }
  if (raw.includes("all")) {
    return Object.keys(TOOL_TARGETS);
  }

  const tools = [];
  for (const tool of raw) {
    if (!TOOL_TARGETS[tool]) {
      throw new Error(`Unknown tool '${tool}'. Expected one of: ${Object.keys(TOOL_TARGETS).join(",")},all`);
    }
    if (!tools.includes(tool)) {
      tools.push(tool);
    }
  }
  return tools;
}

async function resolveTools(args) {
  if (args.tools) {
    return args.tools;
  }

  if (args.command === "status") {
    return Object.keys(TOOL_TARGETS);
  }

  if (process.stdin.isTTY && process.stdout.isTTY) {
    return promptForTools();
  }

  return ["codex"];
}

async function promptForTools() {
  const entries = Object.entries(TOOL_TARGETS);
  console.log("Select project instruction targets:");
  entries.forEach(([key, target], index) => {
    console.log(`  ${index + 1}. ${target.label} (${target.file}) [${key}]`);
  });
  console.log("  all. All targets");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question("Tools to configure (comma-separated, default: codex): ");
    const value = answer.trim() || "codex";
    const mapped = value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .map((item) => {
        const number = Number(item);
        if (Number.isInteger(number) && number >= 1 && number <= entries.length) {
          return entries[number - 1][0];
        }
        return item;
      })
      .join(",");
    return normalizeTools(mapped);
  } finally {
    rl.close();
  }
}

async function resolveLang(args) {
  if (args.command === "status") {
    return args.lang;
  }
  if (process.stdin.isTTY && process.stdout.isTTY && !process.argv.includes("--lang")) {
    return promptForLang(args.lang);
  }
  return args.lang;
}

async function promptForLang(defaultLang) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`Project instruction language (1. English en, 2. Chinese zh-CN, default: ${defaultLang}): `);
    const value = answer.trim();
    if (!value) {
      return defaultLang;
    }
    if (value === "1") {
      return "en";
    }
    if (value === "2") {
      return "zh-CN";
    }
    return normalizeLang(value);
  } finally {
    rl.close();
  }
}

function sourceSkillPath() {
  return path.join(PACKAGE_ROOT, "SKILL.md");
}

function sourceSnippetPath(lang) {
  return path.join(PACKAGE_ROOT, "snippets", `project.${lang}.md`);
}

function renderSnippet(tool, lang) {
  const template = fs.readFileSync(sourceSnippetPath(lang), "utf8");
  return template.replaceAll("{{SKILL_PATH}}", toPosixPath(path.join(TOOL_TARGETS[tool].skillDir, "SKILL.md")));
}

function installedSkillDir(skillsDir) {
  return path.join(skillsDir, SKILL_NAME);
}

function installedSkillPath(skillsDir) {
  return path.join(installedSkillDir(skillsDir), "SKILL.md");
}

function installSkill(skillsDir) {
  const targetDir = installedSkillDir(skillsDir);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(sourceSkillPath(), installedSkillPath(skillsDir));
  return installedSkillPath(skillsDir);
}

function reinstallSkill(skillsDir) {
  const targetSkill = installedSkillPath(skillsDir);
  if (fs.existsSync(targetSkill)) {
    fs.rmSync(targetSkill, { force: true });
  }
  return installSkill(skillsDir);
}

function normalizeNewline(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function projectInstructionPath(projectDir, tool) {
  return path.join(projectDir, TOOL_TARGETS[tool].file);
}

function projectSkillPath(projectDir, tool) {
  return path.join(projectDir, TOOL_TARGETS[tool].skillDir, "SKILL.md");
}

function installProjectSkill(projectDir, tool) {
  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
    throw new Error(`Project directory does not exist: ${projectDir}`);
  }

  const skillPath = projectSkillPath(projectDir, tool);
  const existed = fs.existsSync(skillPath);
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.copyFileSync(sourceSkillPath(), skillPath);
  return { path: skillPath, action: existed ? "replaced" : "created", tool };
}

function upsertProjectSnippet(projectDir, tool, lang) {
  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
    throw new Error(`Project directory does not exist: ${projectDir}`);
  }

  const instructionPath = projectInstructionPath(projectDir, tool);
  fs.mkdirSync(path.dirname(instructionPath), { recursive: true });

  const snippet = normalizeNewline(renderSnippet(tool, lang));
  const existing = fs.existsSync(instructionPath) ? fs.readFileSync(instructionPath, "utf8") : "";
  const block = findManagedBlock(existing);

  if (block) {
    const suffix = existing.slice(block.end).replace(/^\n*/, "");
    const next = `${existing.slice(0, block.start)}${snippet.trimEnd()}${suffix ? `\n\n${suffix}` : ""}`;
    fs.writeFileSync(instructionPath, normalizeNewline(next), "utf8");
    return { path: instructionPath, action: "replaced", tool };
  }

  const separator = existing.trim().length > 0 ? "\n\n" : "";
  fs.writeFileSync(instructionPath, `${normalizeNewline(existing).trimEnd()}${separator}${snippet}`, "utf8");
  return { path: instructionPath, action: existing ? "appended" : "created", tool };
}

function findManagedBlock(content) {
  const markerStart = content.indexOf(MANAGED_START);
  const markerEnd = content.indexOf(MANAGED_END);
  if (markerStart >= 0 && markerEnd >= markerStart) {
    return { start: markerStart, end: markerEnd + MANAGED_END.length };
  }

  const lines = content.split(/(?<=\n)/);
  let offset = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = line.match(/^(#{1,6})\s+Codebase Guard\s*$/);
    if (!heading) {
      offset += line.length;
      continue;
    }

    const level = heading[1].length;
    let end = offset + line.length;
    for (let next = index + 1; next < lines.length; next += 1) {
      const nextHeading = lines[next].match(/^(#{1,6})\s+\S/);
      if (nextHeading && nextHeading[1].length <= level) {
        break;
      }
      end += lines[next].length;
    }
    return { start: offset, end };
  }
  return null;
}

function hasManagedSnippet(projectDir, tool) {
  const instructionPath = projectInstructionPath(projectDir, tool);
  if (!fs.existsSync(instructionPath)) {
    return false;
  }
  return findManagedBlock(fs.readFileSync(instructionPath, "utf8")) !== null;
}

function hasProjectSkill(projectDir, tool) {
  return fs.existsSync(projectSkillPath(projectDir, tool));
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function printProjectResults(results) {
  for (const result of results) {
    const label = TOOL_TARGETS[result.tool].label;
    console.log(`${result.action} ${label} snippet: ${result.path}`);
  }
}

function printSkillResults(results) {
  for (const result of results) {
    const label = TOOL_TARGETS[result.tool].label;
    console.log(`${result.action} ${label} skill: ${result.path}`);
  }
}

function status(args, tools) {
  for (const tool of tools) {
    const targetPath = projectInstructionPath(args.projectDir, tool);
    const skillPath = projectSkillPath(args.projectDir, tool);
    console.log(`${tool}: instructions ${hasManagedSnippet(args.projectDir, tool) ? "configured" : "missing"} ${targetPath}`);
    console.log(`${tool}: skill ${hasProjectSkill(args.projectDir, tool) ? "installed" : "missing"} ${skillPath}`);
  }
}

function init(args, tools, lang) {
  const skillResults = tools.map((tool) => installProjectSkill(args.projectDir, tool));
  const snippetResults = tools.map((tool) => upsertProjectSnippet(args.projectDir, tool, lang));
  printSkillResults(skillResults);
  printProjectResults(snippetResults);
}

function update(args, tools, lang) {
  const skillResults = tools.map((tool) => installProjectSkill(args.projectDir, tool));
  const snippetResults = tools.map((tool) => upsertProjectSnippet(args.projectDir, tool, lang));
  printSkillResults(skillResults);
  printProjectResults(snippetResults);
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    if (!args.command || args.command === "help") {
      usage();
      return 0;
    }

    if (args.command === "install-skill") {
      console.log(`installed skill: ${installSkill(args.skillsDir)}`);
    } else if (args.command === "update-skill") {
      console.log(`updated skill: ${reinstallSkill(args.skillsDir)}`);
    } else if (args.command === "init") {
      const tools = await resolveTools(args);
      const lang = await resolveLang(args);
      init(args, tools, lang);
    } else if (args.command === "update") {
      const tools = await resolveTools(args);
      const lang = await resolveLang(args);
      update(args, tools, lang);
    } else if (args.command === "status") {
      const tools = await resolveTools(args);
      status(args, tools);
    } else {
      throw new Error(`Unknown command: ${args.command}`);
    }
    return 0;
  } catch (error) {
    console.error(`codebase-guard: ${error.message}`);
    console.error("Run `codebase-guard --help` for usage.");
    return 1;
  }
}

main().then((code) => {
  process.exitCode = code;
});
