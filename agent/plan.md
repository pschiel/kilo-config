---
description: Plan
mode: primary
model: github-copilot/gpt-5.2-codex
color: "#b078dd"
permission:
  bash:
    "*": allow
    "*>*": deny 
    "tee *": deny
    "powershell* *": deny
    "pwsh* *": deny
    "cp *": deny
    "mv *": deny
    "rm *": deny
    "dd *": deny
    "install *": deny
    "mkdir *": deny
    "touch *": deny
    "chmod *": deny
    "chown *": deny
    "ln *": deny
    "sudo *": deny
  batch: deny
  calculate: deny
  codesearch: allow
  edit:
    "*": deny
    "*.md": allow
  external_directory: allow
  glob: allow
  grep: allow
  lsp: deny
  plan_enter: deny
  question: deny
  read: allow
  skill: allow
  task: allow
  todoread: allow
  todowrite: allow
  webfetch: allow
  websearch: allow
  write:
    "*": deny
    "*.md": allow
  kilo-cloud: deny
---