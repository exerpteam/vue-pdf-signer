#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMENT=""
SHOULD_COMMIT="no"
MODE="dev"
SERVER_PORT="${PDF_SIGNER_PORT:-5553}"
SERVER_HOST="${PDF_SIGNER_HOST:-0.0.0.0}"
HOST_SOURCE="default"

if [[ -n "${PDF_SIGNER_HOST:-}" ]]; then
  HOST_SOURCE="env"
fi

usage() {
  cat <<'USAGE'
Usage: update-attempt-and-run.sh --comment "<text>" [options]

Options:
  -c, --comment <text>   Required text replacing "Attempt: XXXX"
      --commit           Commit using the comment text
      --preview          Serve the built app using "vite preview"
      --dev              Serve using "vite" (default)
  -p, --port <number>    Port to bind (default: 5173 or $PDF_SIGNER_PORT)
      --host <value>     Host/interface to bind (default: 0.0.0.0 or $PDF_SIGNER_HOST)
  -h, --help             Show this help message

The script updates the Attempt banner, rebuilds the project, optionally commits,
and finally starts the demo app bound to the local network.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -c|--comment)
      COMMENT="${2:-}"
      if [[ -z "$COMMENT" ]]; then
        echo "Error: --comment requires a non-empty value." >&2
        exit 1
      fi
      shift 2
      ;;
    --commit)
      SHOULD_COMMIT="yes"
      shift
      ;;
    --preview)
      MODE="preview"
      shift
      ;;
    --dev)
      MODE="dev"
      shift
      ;;
    -p|--port)
      SERVER_PORT="${2:-}"
      if [[ -z "$SERVER_PORT" ]]; then
        echo "Error: --port requires a value." >&2
        exit 1
      fi
      shift 2
      ;;
    --host)
      SERVER_HOST="${2:-}"
      HOST_SOURCE="cli"
      if [[ -z "$SERVER_HOST" ]]; then
        echo "Error: --host requires a value." >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown option '$1'." >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$COMMENT" ]]; then
  echo "Error: --comment is required." >&2
  usage >&2
  exit 1
fi

if ! [[ "$SERVER_PORT" =~ ^[0-9]+$ ]]; then
  echo "Error: port must be a numeric value." >&2
  exit 1
fi

TARGET_FILE="$PROJECT_ROOT/src/lib/components/PdfSigner.vue"

if [[ ! -f "$TARGET_FILE" ]]; then
  echo "Error: unable to find target file at $TARGET_FILE" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required but not found in PATH." >&2
  exit 1
fi

if [[ -z "$SERVER_HOST" ]]; then
  SERVER_HOST="0.0.0.0"
fi

node - "$TARGET_FILE" "$COMMENT" "$MODE" <<'EOF'
const fs = require('fs');
const path = process.argv[2];
const rawComment = process.argv[3] ?? '';
const rawMode = process.argv[4] ?? '';

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const safeComment = escapeHtml(rawComment);
const safeMode = escapeHtml(rawMode.trim());
const decoratedComment = safeMode ? `${safeComment} (${safeMode})` : safeComment;

let content = fs.readFileSync(path, 'utf8');
const pattern = /(Attempt:\s*)([^<]*)/;

if (!pattern.test(content)) {
  console.error('Error: Attempt banner not found in ' + path);
  process.exit(1);
}

const updated = content.replace(pattern, (_, prefix) => `${prefix}${decoratedComment}`);

fs.writeFileSync(path, updated, 'utf8');
EOF

cd "$PROJECT_ROOT"

if command -v pnpm >/dev/null 2>&1; then
  PACKAGE_MANAGER="pnpm"
else
  PACKAGE_MANAGER="npm"
fi

echo "Running build with $PACKAGE_MANAGER..."
if [[ "$PACKAGE_MANAGER" == "pnpm" ]]; then
  pnpm install
  pnpm run build
else
  npm install
  npm run build
fi

if [[ "$SHOULD_COMMIT" == "yes" ]]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Creating commit: $COMMENT"
    git add "$TARGET_FILE" "$PROJECT_ROOT/scripts/update-attempt-and-run.sh"
    if [[ -d "$PROJECT_ROOT/dist" ]]; then
      git add dist
    fi
    if git diff --cached --quiet; then
      echo "No staged changes detected; skipping commit."
    else
      git commit -m "$COMMENT"
    fi
  else
    echo "Warning: not inside a git repository, skipping commit."
  fi
fi

echo "Attempt banner successfully updated to: $COMMENT"
echo "Project built. Starting demo server on the local network..."
if [[ "$MODE" != "dev" && "$MODE" != "preview" ]]; then
  echo "Error: mode must be either 'dev' or 'preview'." >&2
  exit 1
fi

if [[ "$MODE" == "preview" ]]; then
  echo "Building preview bundle..."
  if [[ "$PACKAGE_MANAGER" == "pnpm" ]]; then
    pnpm run build:demo
  else
    npm run build:demo
  fi
fi

echo "Using port $SERVER_PORT"
echo "Binding host $SERVER_HOST (source: $HOST_SOURCE)"

if [[ "$MODE" == "dev" ]]; then
  echo "Launching Vite dev server (Ctrl+C to stop)..."
  if [[ "$PACKAGE_MANAGER" == "pnpm" ]]; then
    exec pnpm run dev --host "$SERVER_HOST" --port "$SERVER_PORT" --strictPort
  else
    exec npm run dev -- --host "$SERVER_HOST" --port "$SERVER_PORT" --strictPort
  fi
else
  echo "Launching Vite preview server (Ctrl+C to stop)..."
  if [[ "$PACKAGE_MANAGER" == "pnpm" ]]; then
    exec pnpm run preview:demo --host "$SERVER_HOST" --port "$SERVER_PORT" --strictPort
  else
    exec npm run preview:demo -- --host "$SERVER_HOST" --port "$SERVER_PORT" --strictPort
  fi
fi
