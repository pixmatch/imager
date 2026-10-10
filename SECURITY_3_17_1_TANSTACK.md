# 3.17.1 — TanStack Start XSS fix (CVE-2026-102989 / GHSA-qx66-fv34-fjm8)

- `@tanstack/react-start` 1.168.32 -> **1.168.60** (first patched release)
- `@tanstack/react-router` 1.170.18 -> **1.170.41** (react-start pins this exact version; both must move together)
- That pulls `@tanstack/start-server-core` 1.169.39 (was 1.169.17 in the old lockfile).

## `bun.lock` was removed on purpose
The old lockfile pinned the vulnerable versions and could not be edited safely by hand (it holds integrity hashes).
Regenerate it once, then commit it with package.json:

    bun install
    bun pm ls | grep -E "start-server-core|react-start|react-router"   # expect 1.169.39+, 1.168.60+, 1.170.41

If you skip this, Vercel's `bun install` resolves fresh and writes its own lockfile, but other caret-range
dependencies may also move to newer releases. `bunfig.toml` still skips packages younger than 24 hours.

After pushing, redeploy on Vercel (an already-deployed app stays vulnerable until it is rebuilt).
