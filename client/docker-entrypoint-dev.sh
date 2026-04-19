#!/bin/sh
set -e
cd /app
# Non-interactive Docker has no TTY; pnpm needs CI=true to replace node_modules in a volume.
export CI="${CI:-true}"
# Named volume client_node_modules can outlive image rebuilds; sync deps when lockfile changes.
pnpm install --frozen-lockfile
# Call `next` directly — `pnpm dev -- -H …` becomes `next dev -- -H …` and Next treats `-H` as a directory.
exec pnpm exec next dev -H 0.0.0.0 -p 3000
