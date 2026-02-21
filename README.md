# kilo config

## config.json

[config.json](config.json) - main kilo config.

Includes most options, all keybinds, some MCP configs, LMStudio setup.

*Note: MCP toggle keybinds needs a [patch](https://github.com/Kilo-Org/kilo/pull/127)*

## agent/

Agent configs.

*Note: system/subagents config needs a patch.*

## command/

...

## tool/

### kilo-cloud

[tool/kilo-cloud.ts](tool/kilo-cloud.ts) - provides access to Kilo Cloud API endpoints via tRPC and REST.

Usage: set `KILO_API_KEY` env var, ask agent about kilo-cloud tool.

### speak

[tool/speak.ts](tool/speak.ts) - uses Pocket TTS to speak a short summary after assistant turns.

Usage: see top comment in speak.ts how to install speaker and run TTS server. Adjust prompts as needed.

## doc/

[kilo-win32.md](doc/kilo-win32.md) - Windows specific docs
