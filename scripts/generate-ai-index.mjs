#!/usr/bin/env node
/**
 * generate-ai-index.mjs
 *
 * Deterministic AI_INDEX.md generator.
 * Scans a repo, finds domains/entries/exports/imports/tests,
 * outputs in routing manifest format.
 *
 * Usage:
 *   node scripts/generate-ai-index.mjs [srcDir] [testDir]
 *
 * Defaults:
 *   srcDir  = ./src
 *   testDir = ./tests
 *
 * Output: prints AI_INDEX.md to stdout. Redirect to file:
 *   node scripts/generate-ai-index.mjs > AI_INDEX.md
 */

import fs from "fs";
import path from "path";

// Optional: acorn for better JS/TS symbol extraction
let acorn, acornWalk;
try {
  acorn = await import("acorn");
  acornWalk = await import("acorn-walk");
} catch {
  // acorn not installed — regex fallback works fine
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const SRC_DIR = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, "src");
const TEST_DIR = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(ROOT, "tests");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "__pycache__",
  ".venv",
  "venv",
  "coverage",
  ".cache",
]);

const CODE_EXTS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".rb",
]);

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

function walk(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (entry.isFile() && CODE_EXTS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

// ---------------------------------------------------------------------------
// Domain detection
// ---------------------------------------------------------------------------

function detectDomains(srcFiles) {
  // Group files by their first directory under src/
  // Flat files (directly in src/) become their own domain by filename
  const domains = new Map();

  for (const file of srcFiles) {
    const relPath = path.relative(SRC_DIR, file);
    const parts = relPath.split(path.sep);

    let domainKey;
    if (parts.length === 1) {
      // Flat file in src/ root — domain = filename without extension
      domainKey = path.basename(parts[0], path.extname(parts[0]));
    } else {
      // Nested — domain = first directory
      domainKey = parts[0];
    }

    if (!domains.has(domainKey)) {
      domains.set(domainKey, { files: [], entry: null, exports: [], imports: [] });
    }
    domains.get(domainKey).files.push(file);
  }

  return domains;
}

// ---------------------------------------------------------------------------
// Entry file detection
// ---------------------------------------------------------------------------

function findEntry(domain) {
  const entryPatterns = [/^index\./, /^main\./, /^mod\./];

  // For single-file domains, the file IS the entry
  if (domain.files.length === 1) {
    return domain.files[0];
  }

  // Look for index/main files (NOT __init__.py — it's usually empty in Python)
  for (const file of domain.files) {
    const basename = path.basename(file);
    if (entryPatterns.some((p) => p.test(basename))) {
      return file;
    }
  }

  // For Python: skip __init__.py, find the most meaningful file
  const nonInit = domain.files.filter((f) => path.basename(f) !== "__init__.py");
  if (nonInit.length > 0) {
    // Prefer files matching domain name, then shortest non-init filename
    const domainName = path.basename(path.dirname(domain.files[0])).toLowerCase();
    const domainMatch = nonInit.find((f) => path.basename(f, path.extname(f)).toLowerCase() === domainName);
    if (domainMatch) return domainMatch;
    return nonInit.sort((a, b) => path.basename(a).length - path.basename(b).length)[0];
  }

  // Last resort: __init__.py
  return domain.files.find((f) => path.basename(f) === "__init__.py") || domain.files[0];
}

// ---------------------------------------------------------------------------
// Symbol extraction — acorn AST for JS/TS, regex fallback for Python/Go
// ---------------------------------------------------------------------------

// Utility names to deprioritize in Search keywords (too generic to be useful)
const UTILITY_NAMES = new Set([
  "exists", "resolve", "join", "parse", "format", "init", "setup",
  "read", "write", "get", "set", "has", "is", "to", "from",
  "safeReadFile", "safeStat", "safeRename",
]);

function extractSymbolsAcorn(file) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return null; // signal: use regex fallback
  }

  const ext = path.extname(file);
  if (![".js", ".mjs", ".cjs"].includes(ext)) return null; // acorn = JS only

  let ast;
  try {
    ast = acorn.parse(content, { sourceType: "module", ecmaVersion: 2024 });
  } catch {
    return null; // parse error — fall back to regex
  }

  const exported = [];
  const internal = [];

  acornWalk.simple(ast, {
    ExportNamedDeclaration(node) {
      if (node.declaration) {
        if (node.declaration.type === "FunctionDeclaration" && node.declaration.id) {
          exported.push(node.declaration.id.name);
        }
        if (node.declaration.type === "VariableDeclaration") {
          for (const decl of node.declaration.declarations) {
            if (decl.id?.name) exported.push(decl.id.name);
          }
        }
        if (node.declaration.type === "ClassDeclaration" && node.declaration.id) {
          exported.push(node.declaration.id.name);
        }
      }
      if (node.specifiers) {
        for (const spec of node.specifiers) {
          exported.push(spec.exported.name);
        }
      }
    },
    ExportDefaultDeclaration(node) {
      if (node.declaration?.id) exported.push(node.declaration.id.name);
    },
    FunctionDeclaration(node) {
      if (node.id) internal.push(node.id.name);
    },
  });

  // Remove exported names from internal list
  const exportedSet = new Set(exported);
  const internalsOnly = internal.filter((n) => !exportedSet.has(n) && !UTILITY_NAMES.has(n));

  // Exported first, then top internal functions (by name length — longer = more specific)
  const sortedInternals = internalsOnly.sort((a, b) => b.length - a.length);
  const combined = [...exported, ...sortedInternals];

  // Return top 8: all exports + fill remaining slots with internal functions
  return combined.slice(0, 8);
}

function extractExportsRegex(file) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }

  const symbols = new Set();
  const lines = content.split("\n");

  for (const line of lines) {
    let m;

    // JS/TS: export function/class/const/type/interface/enum
    m = line.match(/^export\s+(?:default\s+)?(?:function|class|const|let|var|async\s+function|type|interface|enum)\s+(\w+)/);
    if (m) { symbols.add(m[1]); continue; }

    // JS/TS: export { name }
    m = line.match(/^export\s*\{([^}]+)\}/);
    if (m) {
      m[1].split(",").forEach((s) => {
        const name = s.trim().split(/\s+as\s+/)[0].trim();
        if (name && /^\w+$/.test(name)) symbols.add(name);
      });
      continue;
    }

    // Python: def / class at module level
    m = line.match(/^(def|class)\s+(\w+)/);
    if (m && !m[2].startsWith("_")) { symbols.add(m[2]); continue; }

    // Go: func / type (exported = capitalized)
    m = line.match(/^func\s+(\w+)/);
    if (m && m[1][0] === m[1][0].toUpperCase()) { symbols.add(m[1]); continue; }
    m = line.match(/^type\s+(\w+)/);
    if (m && m[1][0] === m[1][0].toUpperCase()) { symbols.add(m[1]); continue; }

    // module.exports
    m = line.match(/module\.exports\s*=\s*\{([^}]+)\}/);
    if (m) {
      m[1].split(",").forEach((s) => {
        const name = s.trim().split(/\s*:/)[0].trim();
        if (name && /^\w+$/.test(name)) symbols.add(name);
      });
    }
  }

  return [...symbols].sort((a, b) => b.length - a.length).slice(0, 5);
}

function extractExports(file) {
  // Try acorn first (JS only, better results), fall back to regex
  if (acorn && acornWalk) {
    const result = extractSymbolsAcorn(file);
    if (result !== null) return result;
  }
  return extractExportsRegex(file);
}

// ---------------------------------------------------------------------------
// HTTP route extraction
// ---------------------------------------------------------------------------

function extractRoutes(file) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }

  const routes = [];

  for (const line of content.split("\n")) {
    let m;

    // Express/Hono/Koa: app.get('/path', ...) or router.post('/path', ...)
    m = line.match(/(?:app|router|server)\.(get|post|put|delete|patch|all|use)\s*\(\s*['"`]([^'"`\s]+)['"`]/i);
    if (m) {
      routes.push({ method: m[1].toUpperCase(), path: m[2] });
      continue;
    }

    // NestJS/decorator style: @Get('/path'), @Post('/path')
    m = line.match(/@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (m) {
      routes.push({ method: m[1].toUpperCase(), path: m[2] });
      continue;
    }

    // Flask/FastAPI: @app.route('/path') or @app.get('/path')
    m = line.match(/@(?:app|router)\.(route|get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (m) {
      const method = m[1] === "route" ? "ALL" : m[1].toUpperCase();
      routes.push({ method, path: m[2] });
      continue;
    }

    // Raw HTTP server: path === '/api/...' with method check on nearby line
    m = line.match(/path\s*===?\s*['"`](\/[^'"`]+)['"`]/);
    if (m) {
      // Try to detect method from same line: req.method === "GET"
      const methodMatch = line.match(/method\s*===?\s*['"`](GET|POST|PUT|DELETE|PATCH)['"`]/i);
      routes.push({ method: methodMatch ? methodMatch[1].toUpperCase() : "?", path: m[1] });
      continue;
    }

    // url === '/path' (alternate variable name)
    m = line.match(/url\s*===?\s*['"`](\/[^'"`]+)['"`]/);
    if (m) {
      routes.push({ method: "?", path: m[1] });
      continue;
    }

    // url.startsWith('/api/...')  or  path.startsWith('/api/...')
    m = line.match(/(?:url|path)\.startsWith\s*\(\s*['"`](\/[^'"`]+)['"`]\s*\)/);
    if (m) {
      routes.push({ method: "?", path: m[1] });
      continue;
    }

    // String matching against URL paths: case '/api/...'
    m = line.match(/case\s+['"`](\/api\/[^'"`]+)['"`]/);
    if (m) {
      routes.push({ method: "?", path: m[1] });
      continue;
    }
  }

  // Filter out static file serves and deduplicate
  const staticExts = new Set([".html", ".css", ".js", ".mjs", ".ico", ".png", ".jpg", ".svg", ".map", ".woff", ".woff2"]);
  const seen = new Set();
  return routes.filter((r) => {
    // Skip static file paths
    const ext = path.extname(r.path);
    if (ext && staticExts.has(ext)) return false;
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Import extraction — builds cross-domain connections
// ---------------------------------------------------------------------------

function extractImports(file, srcDir) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }

  const imports = [];
  const lines = content.split("\n");

  for (const line of lines) {
    let m;

    // JS/TS: import ... from './path'  or  import ... from '../path'
    m = line.match(/(?:import|from)\s+[^'"]*['"](\.[^'"]+)['"]/);
    if (m) {
      imports.push(m[1]);
      continue;
    }

    // JS: require('./path')
    m = line.match(/require\s*\(\s*['"](\.[^'"]+)['"]\s*\)/);
    if (m) {
      imports.push(m[1]);
      continue;
    }

    // Python: from .module import ... or from app.module import ...
    m = line.match(/^from\s+([\w.]+)\s+import\s+(.+)/);
    if (m) {
      imports.push(m[1]);
      continue;
    }
  }

  return imports;
}

function resolveImportToDomain(importPath, fromFile, domains, srcDir) {
  const fromDir = path.dirname(fromFile);
  let resolved;

  if (importPath.startsWith(".")) {
    // Relative import (JS/Python)
    resolved = path.resolve(fromDir, importPath);
  } else if (importPath.includes(".")) {
    // Python dotted import — try multiple resolution strategies
    const parts = importPath.split(".");

    // Strategy 1: full path under srcDir (from app.core.discovery → app/core/discovery)
    resolved = path.join(srcDir, ...parts);

    // Strategy 2: strip common prefix if srcDir already contains it
    // e.g., srcDir = app/core, importPath = app.core.discovery → just "discovery"
    const srcParts = path.relative(process.cwd(), srcDir).split(path.sep);
    let matchLen = 0;
    for (let i = 0; i < Math.min(parts.length, srcParts.length); i++) {
      if (parts[i] === srcParts[i]) matchLen++;
      else break;
    }
    if (matchLen > 0) {
      const stripped = parts.slice(matchLen);
      if (stripped.length > 0) {
        const strippedPath = path.join(srcDir, ...stripped);
        // Check if stripped resolves to a domain
        for (const [domainName, domain] of domains) {
          const candidates = [strippedPath, strippedPath + ".py", path.join(strippedPath, "__init__.py")];
          for (const c of candidates) {
            if (domain.files.some((f) => f === c || f.startsWith(strippedPath + path.sep))) {
              return domainName;
            }
          }
        }
      }
    }

    // Strategy 3: match by last meaningful part of dotted path against domain names
    // e.g., from app.core.discovery.scanner import X → domain "discovery" or "scanner"
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (domains.has(part)) return part;
      // Try with underscores/hyphens normalized
      const normalized = part.replace(/-/g, "_");
      if (domains.has(normalized)) return normalized;
    }
  } else {
    return null; // External package (no dots, no relative path)
  }

  // Try with common extensions
  const candidates = [
    resolved,
    resolved + ".js",
    resolved + ".mjs",
    resolved + ".ts",
    resolved + ".tsx",
    resolved + ".py",
    path.join(resolved, "index.js"),
    path.join(resolved, "index.ts"),
    path.join(resolved, "__init__.py"),
  ];

  for (const candidate of candidates) {
    for (const [domainName, domain] of domains) {
      if (domain.files.some((f) => f === candidate || f.startsWith(candidate + path.sep))) {
        return domainName;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Event / queue / async connection detection (two-pass: collect then match)
// ---------------------------------------------------------------------------

function extractEventSignals(file) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return { emitters: [], listeners: [] };
  }

  const emitters = [];
  const listeners = [];

  for (const line of content.split("\n")) {
    let m;

    // --- JS/TS EventEmitter ---
    // .emit('event-name', ...) — producer
    m = line.match(/\.emit\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (m) { emitters.push({ name: m[1], type: "event" }); continue; }

    // .on('event-name', ...) or .once('event-name', ...) or .addEventListener('event-name', ...)
    // Filter out DOM events (click, mouseover, etc.) to reduce noise
    m = line.match(/\.(?:on|once|addEventListener|addListener)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (m) {
      const name = m[1];
      const domEvents = new Set([
        "click", "dblclick", "mousedown", "mouseup", "mouseover", "mouseout",
        "mousemove", "mouseenter", "mouseleave", "keydown", "keyup", "keypress",
        "submit", "change", "input", "focus", "blur", "scroll", "resize",
        "load", "unload", "error", "DOMContentLoaded", "readystatechange",
        "touchstart", "touchend", "touchmove", "wheel", "contextmenu",
      ]);
      if (!domEvents.has(name)) {
        listeners.push({ name, type: "event" });
      }
      continue;
    }

    // --- Python signals / Django / Celery ---
    // signal.send(...) or signal.connect(...)
    m = line.match(/(\w+)\.send\s*\(/);
    if (m && /signal/i.test(m[1])) { emitters.push({ name: m[1], type: "signal" }); continue; }
    m = line.match(/(\w+)\.connect\s*\(/);
    if (m && /signal/i.test(m[1])) { listeners.push({ name: m[1], type: "signal" }); continue; }

    // @celery.task / @app.task / @shared_task — task definition (listener)
    m = line.match(/@(?:celery\.task|app\.task|shared_task)/);
    if (m) { listeners.push({ name: "__celery_task__", type: "celery" }); continue; }

    // .delay() or .apply_async() — task caller (emitter)
    m = line.match(/(\w+)\.(?:delay|apply_async)\s*\(/);
    if (m) { emitters.push({ name: m[1], type: "celery" }); continue; }

    // --- Redis pub/sub ---
    m = line.match(/\.publish\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (m) { emitters.push({ name: m[1], type: "redis" }); continue; }
    m = line.match(/\.subscribe\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (m) { listeners.push({ name: m[1], type: "redis" }); continue; }

    // --- Generic dispatch / handle pattern ---
    m = line.match(/dispatch\s*\(\s*\{[^}]*type\s*:\s*['"`]([^'"`]+)['"`]/);
    if (m) { emitters.push({ name: m[1], type: "dispatch" }); continue; }

    // --- WebSocket ---
    m = line.match(/ws\.send\s*\(/);
    if (m) { emitters.push({ name: "__ws__", type: "websocket" }); continue; }
    m = line.match(/ws\.on\s*\(\s*['"`]message['"`]/);
    if (m) { listeners.push({ name: "__ws__", type: "websocket" }); continue; }
  }

  return { emitters, listeners };
}

function buildEventConnections(domains, srcDir) {
  // Pass 1: collect all signals per domain
  const domainEmitters = new Map();  // domain -> [{ name, type, file }]
  const domainListeners = new Map(); // domain -> [{ name, type, file }]

  for (const [domainName, domain] of domains) {
    domainEmitters.set(domainName, []);
    domainListeners.set(domainName, []);

    for (const file of domain.files) {
      const { emitters, listeners } = extractEventSignals(file);
      for (const e of emitters) {
        domainEmitters.get(domainName).push({ ...e, file: rel(file) });
      }
      for (const l of listeners) {
        domainListeners.get(domainName).push({ ...l, file: rel(file) });
      }
    }
  }

  // Pass 2: match emitters to listeners by event name across domains
  const eventEdges = []; // { from, to, eventName, type, fromFile, toFile }

  for (const [emitDomain, emits] of domainEmitters) {
    for (const emit of emits) {
      for (const [listenDomain, listens] of domainListeners) {
        if (listenDomain === emitDomain) continue;
        for (const listen of listens) {
          if (listen.name === emit.name && listen.type === emit.type) {
            eventEdges.push({
              from: emitDomain,
              to: listenDomain,
              eventName: emit.name,
              type: emit.type,
              fromFile: emit.file,
              toFile: listen.file,
            });
          }
        }
      }
    }
  }

  return eventEdges;
}

// ---------------------------------------------------------------------------
// Test file matching
// ---------------------------------------------------------------------------
// Documentation discovery — find repo docs that match a domain
// ---------------------------------------------------------------------------

function walkDocs(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDocs(full, results);
    } else if (entry.isFile() && /\.(md|mdx|txt|rst)$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function findDocs(domainName) {
  const domainLower = domainName.toLowerCase().replace(/-/g, "_");
  const domainKebab = domainName.toLowerCase().replace(/_/g, "-");
  const matches = [];

  // Common doc directory patterns
  const docDirs = ["docs", "doc", "documentation"];
  for (const docDir of docDirs) {
    const absDocDir = path.join(ROOT, docDir);
    if (!fs.existsSync(absDocDir)) continue;

    let docFiles;
    try {
      docFiles = walkDocs(absDocDir);
    } catch {
      continue;
    }

    for (const docFile of docFiles) {
      const docBase = path.basename(docFile, path.extname(docFile)).toLowerCase();
      const docRelPath = path.relative(ROOT, docFile).toLowerCase();
      const docDirParts = docRelPath.split(path.sep);

      // Match by filename or directory containing domain name
      if (
        docBase === domainLower ||
        docBase === domainKebab ||
        docBase.includes(domainLower) ||
        docBase.includes(domainKebab) ||
        docDirParts.some((p) => p === domainLower || p === domainKebab)
      ) {
        matches.push(docFile);
      }
    }
  }

  // Cap at 3 most relevant docs
  return matches.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Test file matching
// ---------------------------------------------------------------------------

function findTests(domainName, domainFiles, testDir) {
  let testFiles;
  try {
    testFiles = walk(testDir);
  } catch {
    return [];
  }

  const matches = new Set();
  const domainLower = domainName.toLowerCase().replace(/-/g, "_");

  for (const testFile of testFiles) {
    const testBase = path.basename(testFile).toLowerCase();
    const testRelPath = path.relative(testDir, testFile).toLowerCase();

    // Skip __init__.py — never useful as a test match
    if (testBase === "__init__.py") continue;

    // Strategy 1: Python-style — test directory matches domain name
    // e.g., tests/discovery/test_scanner.py matches "discovery" domain
    const testDirParts = testRelPath.split(path.sep);
    if (testDirParts.some((part) => part === domainLower || part === domainLower.replace(/_/g, "-"))) {
      matches.add(testFile);
      continue;
    }

    // Strategy 2: test filename contains domain name
    // e.g., test-move-destinations.mjs matches "mover" → skip, too loose
    // Be stricter: filename must start with test_ or test- followed by domain name
    if (testBase.match(new RegExp(`^test[_-].*${domainLower.replace(/_/g, "[_-]")}`))) {
      matches.add(testFile);
      continue;
    }

    // Strategy 3: match by domain entry filename (for JS/TS repos)
    for (const df of domainFiles) {
      const srcBase = path.basename(df, path.extname(df)).toLowerCase();
      if (srcBase === "__init__") continue; // Skip __init__ matching
      if (testBase.includes(srcBase) && srcBase.length > 3) {
        matches.add(testFile);
      }
    }
  }

  // Cap at 5 test files to avoid bloat
  return [...matches].slice(0, 5);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Source directory not found: ${SRC_DIR}`);
    console.error("Usage: node generate-ai-index.mjs [srcDir] [testDir]");
    process.exit(1);
  }

  const srcFiles = walk(SRC_DIR);
  const domains = detectDomains(srcFiles);

  // Step 1: Find entries and exports for each domain
  for (const [name, domain] of domains) {
    domain.entry = findEntry(domain);
    domain.exports = extractExports(domain.entry);

    // Also extract exports from other files in the domain
    for (const file of domain.files) {
      if (file !== domain.entry) {
        const moreExports = extractExports(file);
        for (const sym of moreExports) {
          if (!domain.exports.includes(sym) && domain.exports.length < 8) {
            domain.exports.push(sym);
          }
        }
      }
    }
  }

  // Step 2: Map cross-domain imports
  const connections = new Map(); // domain -> Set of { target, via }

  for (const [domainName, domain] of domains) {
    connections.set(domainName, new Set());

    for (const file of domain.files) {
      const imports = extractImports(file, SRC_DIR);
      for (const imp of imports) {
        const targetDomain = resolveImportToDomain(imp, file, domains, SRC_DIR);
        if (targetDomain && targetDomain !== domainName) {
          // Find which symbols are being imported
          const content = fs.readFileSync(file, "utf8");
          const importLine = content.split("\n").find((l) => l.includes(imp));
          const symbols = [];

          if (importLine) {
            // Named imports: import { foo, bar } from '...'
            const namedMatch = importLine.match(/import\s*\{\s*([^}]+)\s*\}\s*from/);
            if (namedMatch) {
              namedMatch[1].split(",").forEach((s) => {
                const name = s.trim().split(/\s+as\s+/)[0].trim();
                if (name && /^\w+$/.test(name)) symbols.push(name);
              });
            }

            // Default import: import foo from '...'
            if (symbols.length === 0) {
              const defaultMatch = importLine.match(/import\s+(\w+)\s+from/);
              if (defaultMatch) symbols.push(defaultMatch[1]);
            }

            // Python: from X import foo, bar
            if (symbols.length === 0) {
              const pyMatch = importLine.match(/from\s+\S+\s+import\s+(.+)/);
              if (pyMatch) {
                pyMatch[1].split(",").forEach((s) => {
                  const name = s.trim();
                  if (name && /^\w+$/.test(name)) symbols.push(name);
                });
              }
            }
          }

          const via = symbols.length > 0
            ? symbols.slice(0, 3).join(", ") + (symbols.length > 3 ? "…" : "")
            : path.basename(imp);
          const fromFile = rel(file);
          connections.get(domainName).add(JSON.stringify({ target: targetDomain, via, fromFile }));
        }
      }
    }
  }

  // Step 2b: Extract HTTP routes for each domain
  const domainRoutes = new Map();
  for (const [name, domain] of domains) {
    const routes = [];
    for (const file of domain.files) {
      const fileRoutes = extractRoutes(file);
      for (const r of fileRoutes) {
        routes.push({ ...r, file: rel(file) });
      }
    }
    domainRoutes.set(name, routes);
  }

  // Step 2c: Detect event/queue/async connections (two-pass)
  const eventEdges = buildEventConnections(domains, SRC_DIR);
  for (const edge of eventEdges) {
    if (!connections.has(edge.from)) continue;
    const typeLabel = { event: "event", redis: "redis pub/sub", celery: "celery task", signal: "signal", dispatch: "dispatch", websocket: "websocket" };
    const label = typeLabel[edge.type] || edge.type;
    connections.get(edge.from).add(JSON.stringify({
      target: edge.to,
      via: `${edge.eventName} (${label})`,
      fromFile: edge.fromFile,
    }));
  }

  // Step 3: Find tests + docs
  const domainTests = new Map();
  const domainDocs = new Map();
  for (const [name, domain] of domains) {
    domainTests.set(name, findTests(name, domain.files, TEST_DIR));
    domainDocs.set(name, findDocs(name));
  }

  // Step 4: Output
  const lines = [];
  lines.push("# AI_INDEX.md");
  lines.push("");
  lines.push("## How to use this file");
  lines.push("- Navigation only. Not source of truth.");
  lines.push("- Read actual source files before making any claim.");
  lines.push("");
  lines.push("---");

  // Sort domains: entry points first (files with "server", "app", "main", "cli" in name)
  const entryKeywords = ["cli", "main", "app", "server", "index"];
  const sorted = [...domains.entries()].sort((a, b) => {
    const aIsEntry = entryKeywords.some((k) => a[0].toLowerCase().includes(k));
    const bIsEntry = entryKeywords.some((k) => b[0].toLowerCase().includes(k));
    if (aIsEntry && !bIsEntry) return -1;
    if (!aIsEntry && bIsEntry) return 1;
    return a[0].localeCompare(b[0]);
  });

  for (const [name, domain] of sorted) {
    lines.push("");
    // Format domain name: kebab-case to Title Case
    const title = name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`### ${title}`);
    lines.push(`- Entry: \`${rel(domain.entry)}\``);

    if (domain.exports.length > 0) {
      lines.push(`- Search: ${domain.exports.join(", ")}`);
    }

    const tests = domainTests.get(name);
    if (tests && tests.length > 0) {
      lines.push(`- Tests: ${tests.map((t) => `\`${rel(t)}\``).join(", ")}`);
    }

    // Domain docs
    const docs = domainDocs.get(name);
    if (docs && docs.length > 0) {
      lines.push(`- Docs: ${docs.map((d) => `\`${rel(d)}\``).join(", ")}`);
    }

    // HTTP routes
    const routes = domainRoutes.get(name);
    if (routes && routes.length > 0) {
      lines.push(`- Routes: ${routes.map((r) => `\`${r.method} ${r.path}\``).join(", ")}`);
    }

    const conns = connections.get(name);
    if (conns && conns.size > 0) {
      // Deduplicate: group by target domain, collect unique symbols
      const byTarget = new Map();
      for (const connJson of conns) {
        const conn = JSON.parse(connJson);
        if (!byTarget.has(conn.target)) {
          byTarget.set(conn.target, new Set());
        }
        // Add the "via" symbol(s) to the set
        conn.via.split(", ").forEach((v) => byTarget.get(conn.target).add(v));
      }
      lines.push("- Connects to:");
      for (const [target, viaSet] of byTarget) {
        const targetTitle = target.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const viaList = [...viaSet].slice(0, 4);
        const suffix = viaSet.size > 4 ? ` (+${viaSet.size - 4} more)` : "";
        lines.push(`  - ${targetTitle} — via ${viaList.join(", ")}${suffix}`);
      }
    }
  }

  lines.push("");
  console.log(lines.join("\n"));
}

main();
