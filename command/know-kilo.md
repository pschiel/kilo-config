---
name: know-kilo
description: Kilo development and configuration reference
---

# Kilo development and configuration reference

**Note:** `$KILO_BASE` references the base folder of the Kilo repositories at https://github.com/Kilo-Org
- `$KILO_BASE/cloud` - Kilo Cloud Backend
- `$KILO_BASE/kilo` - Kilo CLI
- `$KILO_BASE/kilocode` - Kilo VSCode Extension

## Overview

Kilo is a unified server/client for AI interaction with remote control and web view capabilities.

**Core Concepts**:

- **Project**: Global instance + per-git-repo instance (based on worktree)
- **Session**: Chat conversation belonging to a project
- **Providers**: Connects to all major AI providers
- **Features**: On-the-fly session/model/agent swapping, context compaction, undo/redo, session export

**Prompting Components**:

- **System Prompt Composition** (in order):
  1. **Spoof**: Provider-specific header (e.g., anthropic_spoof.txt for Anthropic models)
  2. **Agent/Provider**: Agent's custom prompt OR provider-specific prompt (anthropic.txt, beast.txt, gemini.txt, etc.)
  3. **Environment**: Working directory, git status, platform, date (auto-added)
  4. **Custom**: AGENTS.md/CLAUDE.md from project and global config (auto-added)
  - Note: Custom agent prompt (from config/agent/\*.md) replaces provider prompt, not appended

- **Agent**: Specialized AI assistants configured for specific tasks
  - Types: Primary agents (Build, Plan) and Subagents (General, Explore)
  - Switch with Tab key or @ mention subagents
  - Environment context auto-added: working directory, git status, platform, date
  - Can load custom instructions from `AGENTS.md`, `CLAUDE.md` files (project and global)
  - Reference: `$KILO_BASE/packages/web/src/content/docs/agents.mdx`

- **Agent Skills**: Reusable instructions loaded on-demand via native `skill` tool
  - Agent auto-discovers and loads when task matches description
  - Search paths: `~/.kilo/skill/`, `~/.config/kilo/skill/`, `~/.agents/skill/`
  - Permissions: allow/deny/ask patterns per skill
  - Reference: `$KILO_BASE/packages/web/src/content/docs/skills.mdx`

- **Commands**: Prompt snippets for manual execution via slash commands
  - Location: `~/.config/kilo/command/{name}.md`
  - User-invoked with `/command-name`, not auto-discovered
  - Reference: `$KILO_BASE/packages/web/src/content/docs/commands.mdx`

**Tooling**:

- **Tools**: Local TypeScript code that models invoke
  - Built-in: filesystem (read/write/edit), bash, grep, glob, todos, webfetch
  - Custom: Implement `Tool.Info` interface with `execute()` method
  - LSP auto-integration: Write/Edit tools automatically get syntax validation
  - Examples: `$KILO_BASE/packages/opencode/src/tool/{calculate,speak}.ts`
  - Reference: `$KILO_BASE/packages/web/src/content/docs/{tools,custom-tools}.mdx`

- **MCP**: External tool servers (Model Context Protocol)
  - Advanced capabilities: databases, browser automation, web search
  - Config: `config.json` under `mcp.servers`
  - Reference: `$KILO_BASE/packages/web/src/content/docs/mcp-servers.mdx`

- **LSP**: Language Server Protocol integration
  - Auto-invoked by Write/Edit tools for syntax validation
  - Features: definitions, references, hover, symbols, call hierarchy
  - Manual tool: `mcp_lsp`
  - Reference: `$KILO_BASE/packages/web/src/content/docs/lsp.mdx`

- **ACP**: Agent Client Protocol - use Kilo as agent in editors/IDEs
  - Reference: `$KILO_BASE/packages/web/src/content/docs/acp.mdx`

**SDK & Extensibility**:

- **Client SDK**: TypeScript client for HTTP API remote control
  - Location: `$KILO_BASE/packages/sdk/js/`
  - Reference: `$KILO_BASE/packages/web/src/content/docs/{sdk,server}.mdx`

- **Plugins**: TypeScript hooks into Kilo events
  - Hooks: session lifecycle, tool execution, message processing
  - Example: `$KILO_BASE/packages/opencode/src/plugin/eventlog.ts`
  - Reference: `$KILO_BASE/packages/web/src/content/docs/plugins.mdx`

## Repository Structure

- **Source code**: `$KILO_BASE/packages/opencode/src/`
- **Documentation**: `$KILO_BASE/packages/web/src/content/docs/`
- **Tests**: `$KILO_BASE/packages/opencode/test/`
- **SDK**: `$KILO_BASE/packages/sdk/js/`

## Directory Structure

### Configuration: `~/.config/kilo/`

```
~/.config/kilo/
├── config.json            # Main config: agents, models, API keys, settings
├── command/               # Custom slash commands (*.md files)
├── skill/                 # Custom agent skills (*/SKILL.md)
├── agent/                 # Custom agents (*.md files)
├── tool/                  # Custom tools (*.ts files)
├── plugin/                # Custom plugins (*.ts files)
├── doc/                   # Documentation snippets
├── themes/                # Custom themes
├── package.json           # Dependencies (if needed)
└── node_modules/          # Installed dependencies
```

**Safe config editing**: Use `jq` to avoid JSON syntax errors:

```bash
# Add MCP server
jq '.mcp.servers.myserver = {"command":"node","args":["server.js"]}' \
  ~/.config/kilo/config.json > /tmp/config.json && \
  mv /tmp/config.json ~/.config/kilo/config.json

# Or use editor with validation
code ~/.config/kilo/config.json
```

### Data Storage: `~/.local/share/kilo/`

```
~/.local/share/kilo/
├── log/                   # Session logs (YYYY-MM-DDTHHMM.log, dev.log)
├── storage/
│   ├── message/          # Messages by session (ses_XXX/msg_XXX.json)
│   ├── part/             # Message parts (msg_XXX/prt_XXX.json)
│   ├── session/          # Session metadata by project (projectID/ses_XXX.json)
│   ├── session_diff/     # File diffs for sessions
│   ├── session_share/    # Shared session data
│   ├── project/          # Project metadata
│   ├── todo/             # Todo lists by session
│   └── migration         # Schema version
├── snapshot/             # Git snapshots for file tracking
├── bin/                  # Cached binaries
└── auth.json             # Authentication tokens
```

### Cache: `~/.cache/kilo/`

Build artifacts, temporary files.

## Running Kilo

### Command-Line Usage

**Most common commands**:

```bash
# Interactive TUI (terminal UI)
kilo                           # Start in current directory
kilo /path/to/project          # Start in specific project
kilo -c                        # Continue last session
kilo -s ses_XXX                # Continue specific session

# Send a message directly (non-interactive)
kilo run "your message here"   # Quick one-off prompt
kilo run --model anthropic/claude-sonnet-4 "message"

# Server modes
kilo serve                     # Headless API server (random port)
kilo serve --port 4001         # API server on specific port
kilo web                       # Start server + open web interface

# Session management
kilo session                   # Manage sessions
kilo export ses_XXX            # Export session to JSON
kilo import file.json          # Import session from JSON

# Utilities
kilo stats                     # Show token usage and costs
kilo models                    # List all available models
kilo models anthropic          # List models for specific provider
kilo --help                    # Full command reference
```

**Common options**:

- `-m, --model provider/model` - Specify model
- `-s, --session ses_XXX` - Continue specific session
- `-c, --continue` - Continue last session
- `--agent name` - Use specific agent
- `--port number` - Server port (0 = random)
- `--prompt "text"` - Initial prompt

### Local Development

```bash
# From your Kilo repository clone
cd $KILO_BASE/packages/opencode
bun dev                    # Start TUI
bun dev -- --help          # Show all options
bun dev -- --port 4001     # Custom port
bun dev -- serve           # API server only
bun dev -- run "test"      # Send test message

# Web application (Vite dev server)
cd $KILO_BASE/packages/app
bun dev                    # Start Vite server, click link to see live changes

# Desktop application (Tauri)
cd $KILO_BASE/packages/desktop
bun tauri dev              # Start desktop app in development mode
bun tauri build            # Build desktop binary
```

## Development Feedback Loop

**Essential workflow: modify → run → inspect**

### Quick Test & Inspect

```bash
# 1. Run a test command
kilo run "Calculate: 2 + 2"

# 2. Find the newest session (across all projects)
SESSION_FILE=$(find ~/.local/share/kilo/storage/session -name "*.json" -type f -printf '%T@ %p\n' | sort -rn | head -1 | awk '{print $2}')
SESSION=$(basename "$SESSION_FILE" .json)
echo $SESSION  # Shows: ses_XXX

# 3. View session metadata
jq . "$SESSION_FILE"

# 4. List messages in chronological order (oldest first)
ls -tr ~/.local/share/kilo/storage/message/$SESSION/

# 5. Extract token usage from all messages
jq '.tokens // "no tokens"' ~/.local/share/kilo/storage/message/$SESSION/msg_*.json

# 6. View specific message with role and tokens
jq 'select(.tokens != null) | {role, tokens, model: .modelID}' ~/.local/share/kilo/storage/message/$SESSION/msg_*.json
```

### Complete Workflow Example

```bash
# Clean logs for fresh output
rm ~/.local/share/kilo/log/*.log

# Run test
kilo run "test prompt" --model anthropic/claude-sonnet-4

# Get newest session
SESSION_FILE=$(find ~/.local/share/kilo/storage/session -name "*.json" -type f -printf '%T@ %p\n' | sort -rn | head -1 | awk '{print $2}')
SESSION=$(basename "$SESSION_FILE" .json)

# Check logs for errors
grep -i "error" ~/.local/share/kilo/log/dev.log

# Inspect token usage
echo "=== Token Usage ==="
jq -r 'select(.tokens != null) | "Role: \(.role // "system") | Input: \(.tokens.input) | Output: \(.tokens.output) | Cache Read: \(.tokens.cache.read) | Cache Write: \(.tokens.cache.write)"' \
  ~/.local/share/kilo/storage/message/$SESSION/msg_*.json

# View session title and summary
jq '{id, title, summary}' "$SESSION_FILE"
```

### Finding Sessions

```bash
# Most recent session (any project)
find ~/.local/share/kilo/storage/session -name "*.json" -type f -printf '%T@ %p\n' | sort -rn | head -1 | awk '{print $2}'

# Most recent 5 sessions with titles
find ~/.local/share/kilo/storage/session -name "*.json" -type f -printf '%T@ %p\n' | sort -rn | head -5 | while read ts file; do
  echo "$(basename "$file" .json): $(jq -r '.title' "$file")"
done

# Search by title (case-insensitive)
grep -ri "something" ~/.local/share/kilo/storage/session/ --include="*.json" -l

# Sessions modified today
find ~/.local/share/kilo/storage/session -name "*.json" -mtime 0

# Count messages per session (sorted by message count)
for s in ~/.local/share/kilo/storage/message/ses_*; do
  echo "$(basename $s): $(ls $s 2>/dev/null | wc -l) messages"
done | sort -t: -k2 -n
```

### Log Management

```bash
# Clean logs before test
rm ~/.local/share/kilo/log/*.log

# Watch live
tail -f ~/.local/share/kilo/log/dev.log

# Search session
grep "ses_XXX" ~/.local/share/kilo/log/*.log

# Find errors
grep -i "error\|exception\|failed" ~/.local/share/kilo/log/*.log
```

### Request Logging (request-logging branch)

**Raw request log**: `~/.local/share/kilo/log/dev.request.raw.jsonl`

**Format**: JSONL (JSON Lines) with structured HTTP request/response data

**Diagnostic script**: `~/.local/bin/diagnose-400.sh`

**Log Entry Types**:

- `type: "REQUEST"` - Outgoing API requests (provider, model, body, requestId)
- `type: "RESPONSE"` - API responses (status, requestId, response data)

**Common Use Cases**:

```bash
# Find all 400 errors
jq -s 'map(select(.type=="RESPONSE" and .status==400))' \
  ~/.local/share/kilo/log/dev.request.raw.jsonl

# Get requestId from latest 400 error
jq -s -r 'map(select(.type=="RESPONSE" and .status==400)) | last | .requestId' \
  ~/.local/share/kilo/log/dev.request.raw.jsonl

# Find all requests for a specific requestId
REQUEST_ID="req_XXX"
jq -s --arg id "$REQUEST_ID" 'map(select(.requestId==$id))' \
  ~/.local/share/kilo/log/dev.request.raw.jsonl

# Extract request body for a requestId
jq -s --arg id "$REQUEST_ID" 'map(select(.type=="REQUEST" and .requestId==$id)) | last | .body' \
  ~/.local/share/kilo/log/dev.request.raw.jsonl

# View request + response together
REQUEST_ID="req_XXX"
echo "=== REQUEST ===" && \
jq -s --arg id "$REQUEST_ID" 'map(select(.type=="REQUEST" and .requestId==$id)) | last' \
  ~/.local/share/kilo/log/dev.request.raw.jsonl && \
echo -e "\n=== RESPONSE ===" && \
jq -s --arg id "$REQUEST_ID" 'map(select(.type=="RESPONSE" and .requestId==$id)) | last' \
  ~/.local/share/kilo/log/dev.request.raw.jsonl

# Filter by provider
jq -s 'map(select(.provider=="anthropic"))' \
  ~/.local/share/kilo/log/dev.request.raw.jsonl

# Filter by model
jq -s 'map(select(.model=="claude-sonnet-4"))' \
  ~/.local/share/kilo/log/dev.request.raw.jsonl
```

**Request Log Structure**:

```json
// REQUEST entry
{
  "type": "REQUEST",
  "requestId": "req_XXX",
  "provider": "anthropic",
  "model": "claude-sonnet-4",
  "timestamp": 1706400000000,
  "body": { /* full request payload */ }
}

// RESPONSE entry
{
  "type": "RESPONSE",
  "requestId": "req_XXX",
  "status": 400,
  "timestamp": 1706400001000,
  "data": { /* error or success response */ }
}
```

**When to use request logs**:

- Debugging API errors (400, 500, etc.)
- Analyzing request/response patterns
- Investigating provider-specific issues
- Comparing actual sent requests vs expected
- Correlating API errors with session storage state

### Session Inspection

```bash
# Find session by title
grep -r "title.*pattern" ~/.local/share/kilo/storage/session/

# View session metadata
jq . ~/.local/share/kilo/storage/session/PROJECT_ID/ses_XXX.json

# List messages
ls ~/.local/share/kilo/storage/message/ses_XXX/

# Inspect message
jq . ~/.local/share/kilo/storage/message/ses_XXX/msg_YYY.json
```

## HTTP API

**Base**: `http://localhost:{port}`

### Session Operations

```bash
# Create
POST /session
Body: {"title": "...", "model": {"providerID": "anthropic", "modelID": "claude-sonnet-4"}}
Returns: {"id": "ses_XXX", "projectID": "...", ...}

# Delete
DELETE /session/{sessionId}

# Get messages
GET /session/{sessionId}/message
Returns: [{"info": {...}, "parts": [...]}, ...]

# Send message
POST /session/{sessionId}/message
Body: {"parts": [{"type": "text", "text": "..."}], "model": {...}}
```

**Message structure**:

- `info.role`: "user" | "assistant"
- `parts[]`: text/tool/file/step-start/step-finish parts
- `parts[].type`: determines part content

## Configuration

### config.json Structure

```json
{
  "agent": {
    "custom-agent": {
      "prompt": "System prompt...",
      "model": {"providerID": "...", "modelID": "..."},
      "tools": {...},
      "permission": {...}
    }
  },
  "provider": {
    "anthropic": {"apiKey": "sk-..."},
    "openai": {"apiKey": "sk-..."}
  },
  "mcp": {
    "servers": {
      "server-name": {"command": "node", "args": ["server.js"]}
    }
  }
}
```

**Safe editing**:

1. Backup: `cp ~/.config/kilo/config.json{,.bak}`
2. Edit with `jq` or JSON-aware editor
3. Validate: `jq . ~/.config/kilo/config.json`
4. Restart Kilo

## Creating Custom Components

### Commands

Location: `~/.config/kilo/command/{name}.md`

**Example**: This file (`know-kilo.md`)

**Format**: Markdown with YAML frontmatter (name, description)

**Usage**: `/command-name` in chat

**Official docs**: `$KILO_BASE/packages/web/src/content/docs/commands.mdx`

### Skills

Location: `~/.config/kilo/skill/{name}/SKILL.md`

**Example**: `~/.config/kilo/skill/ping-skill/SKILL.md`

**Format**: Directory + SKILL.md file, same structure as commands

**Discovery**: Agent auto-loads via `mcp_skill` tool when task matches

**Create/Edit**: Use Write for new (creates dir+file), Edit for existing

**Official docs**: `$KILO_BASE/packages/web/src/content/docs/skills.mdx`

### Agents

Location: `~/.config/kilo/agent/{name}.md`

**Example**: `~/.config/kilo/agent/Chat.md`

**Format**: Markdown with YAML frontmatter (model, tools, permissions)

**Usage**: `--agent name` or switch with Tab

**Official docs**: `$KILO_BASE/packages/web/src/content/docs/agents.mdx`

### Tools (Advanced)

**Source**: `$KILO_BASE/packages/kilo/src/tool/`

**Examples**: `calculate.ts`, `speak.ts`, `bash.ts`, `read.ts`, `edit.ts`

**Pattern**: Implement `Tool.Info` with `execute()`, validate with Zod

**Reference**: `$KILO_BASE/packages/kilo/src/tool/tool.ts` for interfaces

**Official docs**:

- `$KILO_BASE/packages/web/src/content/docs/tools.mdx`
- `$KILO_BASE/packages/web/src/content/docs/custom-tools.mdx`

### Plugins (Advanced)

**Source**: `$KILO_BASE/packages/kilo/src/plugin/`

**Example**: `eventlog.ts`

**Pattern**: Hook system - inspect `$KILO_BASE/packages/kilo/src/plugin/index.ts` for available hooks

**Note**: Requires deep internals knowledge

**Official docs**: `$KILO_BASE/packages/web/src/content/docs/plugins.mdx`

## Development

### Testing

```bash
cd $KILO_BASE/packages/opencode
bun test                          # Run all tests
bun test test/tool/bash.test.ts   # Specific test
```

### Type Checking

```bash
bun run typecheck
```

### Building

```bash
bun run build
```

### Workflow

1. Make changes in `$KILO_BASE/packages/opencode/src/`
2. Test with `bun dev` from `$KILO_BASE/packages/opencode/`
3. Run type checking: `bun run typecheck`
4. Create commits when ready

## Architecture

### Source Structure

Key directories in `$KILO_BASE/packages/opencode/src/`:

- `session/` - Session management, compaction, prompts, LLM interaction
- `tool/` - Built-in tools (one file per tool)
- `agent/` - Agent system
- `provider/` - LLM provider integrations
- `server/` - HTTP API
- `cli/cmd/` - CLI commands
- `cli/cmd/tui/` - Terminal UI (SolidJS components)
- `util/` - Utilities (filesystem, logging, tokens)
- `plugin/` - Plugin system
- `flag/` - Feature flags

### File Patterns

- `*.txt` in `src/` - System prompt templates
- `src/cli/cmd/*.ts` - CLI command implementations
- `src/tool/*.ts` - Individual tool files
- `src/provider/transform/*.ts` - Provider-specific transforms

### Message Flow

1. User input → `Session.updateMessage()`
2. `SessionPrompt.process()` orchestrates loop
3. `SessionProcessor.process()` handles streaming/tools
4. Tool calls → `Tool.execute()` (Zod validation, Result pattern)
5. Compaction on overflow → `SessionCompaction.process()`
6. Parts stored in `storage/part/`

### Key Code Locations

**Adding CLI arguments**: `src/cli/cmd/{command}.ts` (uses Zod for validation)

**Creating tools**: Study `src/tool/{bash,read,edit,calculate}.ts` for patterns, implement `Tool.Info` interface

**Provider integrations**: `src/provider/provider.ts` (main), `src/provider/transform/*.ts` (provider-specific)

**TUI components**: `src/cli/cmd/tui/` (SolidJS components), `src/cli/cmd/tui/ui/` (dialogs)

**Important utilities**:

- Token counting: `src/util/token.ts`
- Filesystem: `src/util/filesystem.ts`
- Logging: `src/util/log.ts`

**Core systems**:

- Compaction: `src/session/compaction.ts`
- Message structure: `src/session/message-v2.ts`
- System prompts: `src/session/system.ts`
- Tool execution: `src/tool/tool.ts`

## Documentation

- **Official docs**: https://kilo.ai/docs
- **Doc sources**: `$KILO_BASE/packages/web/src/content/docs/`
- **Source code**: `$KILO_BASE/packages/opencode/src/`
- **Tests**: `$KILO_BASE/packages/opencode/test/`

---

## Local Setup & Tools

**This section contains user-specific setup and utilities. Skip if using standard Kilo.**

### Environment Variables

Set `KILO_DEV_PATH` to your local repository path for convenience:

```bash
export KILO_DEV_PATH="/path/to/kilo"
```

### Windows Path Handling

**Issue**: Windows paths with backslashes cause escaping problems in bash and tool failures.

**Solution**: Always use forward slashes with drive letter format:

- ✅ Correct: `C:/foo/bar.txt`, `E:/src/file.js`
- ❌ Wrong: `C:\foo\bar.txt` (backslashes)
- ❌ Wrong: `/c/foo/bar.txt` (MSYS format without colon)

**Where this matters**:

- All file paths in tool parameters
- Bash commands
- Configuration files

See [../kilo-win32.md](../kilo-win32.md) for more details.

### Log Cleanup

Before debugging or testing, clean logs:

```bash
rm ~/.local/share/kilo/log/*.log
```

Then run Kilo and check `~/.local/share/kilo/log/dev.log` for fresh output.

---

## TASK

**The above is documentation.**

**Arguments**: `$ARGUMENTS`

**If arguments are provided**: The arguments contain your actual task. Silently integrate the knowledge above and immediately proceed with the task specified in the arguments.

**If no arguments**: Simply respond with "I know Kilo." (nothing else) and wait for the actual task.

Exception: If already mid-conversation with a clear pending task, silently integrate this knowledge and continue that task.
