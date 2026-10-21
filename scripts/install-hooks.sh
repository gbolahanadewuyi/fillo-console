#!/usr/bin/env bash
# One-time, per clone: make git use the checked-in hooks in .githooks/.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
chmod +x .githooks/*
echo "Hooks installed: pushes to develop/master now run npm run verify first."
