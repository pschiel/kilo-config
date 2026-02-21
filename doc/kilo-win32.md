# Kilo win32

## Recommended setup

- Use **Git Bash** - can still invoke `pwsh.exe` if needed, models better trained in bash
- During Git install, select **MinTTY** over Windows Console Host
- Use Windows Terminal, set "Interaction > Remove trailing white-space when pasting" to OFF (to paste images)
- Move Git Bash path (e.g. `C:\git\usr\bin`) above `%SystemRoot%\system32` in case WSL is installed
- Setting Git `autocrlf=false` is recommended
- Install jq `winget install --id jqlang.jq` and rg `winget install --id BurntSushi.ripgrep.GNU`

## Bun

- Bun version **must match** root `package.json` `packageManager` field, check `bun --version`
- Downgrade if needed, e.g. https://github.com/oven-sh/bun/releases/download/bun-v1.3.5/bun-windows-x64.zip

## .bashrc

```bash
export OPENCODE_GIT_BASH_PATH="C:/git/usr/bin/bash.exe"
export OPENCODE_DISABLE_AUTOUPDATE=1
export RUST_TARGET=x86_64-pc-windows-msvc
```

## Run dev build

```bash
bun install
cd packages/opencode
bun install
bun --conditions=browser src/index.ts /path/to/project
```

## Debugging Server

- Copy `.vscode/launch.example.json` to `.vscode/launch.json`
- Install "Bun for Visual Studio Code" extension in VSCode
- Start server
```bash
cd packages/opencode
bun run --inspect-wait=ws://localhost:6499/ ./src/index.ts serve --port 4096
```
- Start debug in VSCode, set breakpoints
- Attach TUI in 2nd terminal
```bash
kilo attach http://localhost:4096
```

## Debugging TUI
- Start TUI
```bash
cd packages/opencode
bun run --inspect-wait=ws://localhost:6499/ ./src/index.ts --port 4096
```
- Source maps in tsx don't work in VSCode, use https://debug.bun.sh/#localhost:6499/ instead

## Path normalization (until fixed in dev)

- Merge path normalization patch https://github.com/Kilo-Org/kilo/pull/108
- Fix backslashes in storage json
```bash
#!/bin/bash
set -e

BASE="$HOME/.local/share/kilo"
STORAGE="$BASE/storage"
BACKUP="$BASE/storage-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

echo "Creating backup: $BACKUP"
tar -czf "$BACKUP" -C "$BASE" storage/
echo ""

echo "Converting backslashes to forward slashes in path fields..."

# Process project files: update .worktree and .sandboxes[]
find "$STORAGE/project" -name "*.json" -type f | while read -r file; do
    jq '.worktree |= gsub("\\\\"; "/") |
        if .sandboxes then .sandboxes |= map(gsub("\\\\"; "/")) else . end' \
        "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

# Process session files: update .directory
find "$STORAGE/session" -name "*.json" -type f | while read -r file; do
    jq '.directory |= gsub("\\\\"; "/")' \
        "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

echo "Done! Converted all paths to forward slashes."
```
- Double-check project jsons for possible duplicates
- **Note:** Fixes work also for `cmd.exe`, `powershell.exe` and `pwsh.exe` (forward slash format `E:/x/y` supported by all)

## Reproduction of patch, conflict resolve pattern

Entire patch is 1 rule "normalize paths on win32 systems via `Filesystem` wrapper, where otherwise things will break"

- use `Filesystem.normalize()` around paths that are stored internally, used for matching, or passed to tools
- use `Filesystem.join()` instead if `path.join()` ONLY when segments are absolute paths and should be converted, otherwise use `Filesystem.normalize(path.join(...))`
- use `Filesystem.relative()` instead of `path.relative()`
- use `Filesystem.resolve()` instead of `path.resolve()`
- use `Filesystem.dirname()` instead of `path.dirname()`
 -use `Filesystem.realpath()` instead of `fs.realpath()` or `fs.realpathSync`

## Running test suite

Unit/Integration tests
```bash
cd packages/opencode
bun test
```

E2E tests UI
```bash
cd packages/app
bun run test:e2e:ui
```

E2E tests
```bash
cd packages/app
bun run test:e2e:local
```

## Desktop/Tauri

Build sidecar binary
```bash
cd packages/opencode
rm -rf dist
bun run --bun script/build.ts --target windows-x64 --single
ls -l dist/@kilocode/cli-windows-x64/bin/kilo.exe
```

Run Tauri (will also build)
```bash
cd packages/desktop
bun tauri dev
```

## WSL

BE AWARE:
- using WSL outside its file system can cause up to a million context switches per second, which
  lead to heavy performance problems when accessing/processing a medium to large code base.
- WSL does not handle Windows paths, when your Agent thinks it's on Windows, things will inevitably break.

- Deactivate `timesyncd`. Otherwise HyperV will do hard time resets, which leads to freezes and corrupt timestamps.

```bash
sudo systemctl stop systemd-timesyncd
sudo systemctl disable systemd-timesyncd
```

- Disable `appendWindowsPath` in `/etc/wsl.conf`

```
[interop]
appendWindowsPath = false
```

## Cleanup

Can sometimes help after updates, plugin updates, dependency issues.

```bash
kilo-clean() {
  set -x
  npm cache clean --force
  rm -rf $HOME/.bun/install/cache
  rm -rf $HOME/.local/state/kilo
  rm -rf $HOME/.local/share/kilo/bin
  rm -rf $HOME/.cache/kilo
  rm -rf $HOME/.config/kilo/node_modules
  (cd $HOME/.config/kilo && bun install)
  set +x
}
```
