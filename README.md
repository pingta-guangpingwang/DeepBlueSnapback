# DBHT — DeepBlueHarnessTrace

**Your code's local vault. Version control without the cloud, without the complexity.**

深蓝驭溯 (DBHT) is a local version control system built with Electron + React, featuring an SVN-style centralized repository and distributed working copy architecture.

**Put a leash on AI — make every line of generated code traceable.**

## Author

**Wang Guangping (王广平)**

- WeChat: 1084703441
- Email: 18351267631@163.com
- Website: [www.shenlanai.com](https://www.shenlanai.com)

> I strive to build connections with the world. This is my information tentacle reaching out globally — let's connect.

## Quick Start

### Development

Double-click `start.bat` to launch. Dependencies are automatically installed on first run.

### Production

```bash
npm run build && npm run start
```

### CLI Mode

```bash
# Set root repository
dbht set-root D:/DBHT-Root

# Create a project
dbht create-project my-app

# Check status
dbht status /path/to/project

# Commit changes
dbht commit /path/to/project --message "Fix login bug"
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 8 (port 3005)
- **Desktop**: Electron 28
- **Version Control**: Custom DBHT engine (centralized repo + working copy)
- **Git Remote Sync**: isomorphic-git (pull/push/conflict resolution)
- **CLI**: Commander.js (standalone, no Electron GUI required)

## Architecture

```
DBHT-Root/                        ← Root repository
├── repositories/             ← Central version stores
│   ├── project-a/           ← Per-project version data
│   │   ├── config.json      ← Repository config
│   │   ├── HEAD.json        ← Current version pointer
│   │   ├── commits/         ← Commit records
│   │   └── objects/         ← File snapshots (content-addressed)
│   └── project-b/
├── projects.json             ← Project registry
└── config/
    └── dbht-root.json        ← Root config

Working Copy (any location)/
├── .dbvs-link.json          ← Link to central repository
├── DBHT-GUIDE.md            ← Version control guide (auto-generated)
├── .git/                    ← (Optional) Git remote sync
└── ...project files...
```

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Root Repository** | Top-level directory storing all project version data |
| **Central Repository** | Per-project complete version history (commits + objects) |
| **Working Copy** | The directory you actually work in, linked via `.dbvs-link.json` |
| **Commit** | Save a snapshot of working copy files to the central repository |
| **Update** | Restore files from the central repository to the working copy |
| **Rollback** | Revert to a specific historical version |

## CLI Reference

### Global Options
```
--format <json|table|text>    Output format (default: json)
--root <path>                 Specify root repository path
```

### Root Repository Management
```bash
dbht set-root <path>          # Set root repository path
dbht get-root                 # Get current root repository path
```

### Project Management
```bash
dbht create-project <name>    # Create a new project
dbht import-project <src>     # Import an existing folder as a project
dbht delete-project <name>    # Delete a project
dbht delete-project <name> --keep-files  # Delete version history only, keep files
dbht list-projects            # List all projects
dbht list-repos               # List all repositories
dbht unregister <path>        # Remove from project list
dbht unregister <path> --delete-files  # Remove and delete files
```

### Version Control Operations
```bash
dbht status [path]            # Show working copy status
dbht commit <path> -m "msg"   # Commit changes
dbht commit <path> -m "msg" -f file1,file2  # Commit specific files
dbht update <path>            # Update to latest version
dbht rollback <path> -v v3    # Roll back to specified version
dbht history <path>           # View commit history
dbht log [path] -n 10         # Show recent N commits
dbht diff <path> -f file.ts   # View file diff
dbht diff <path> -f file.ts -a v1 -b v2  # Compare two versions
dbht info <path>              # Show repository info
dbht init <path>              # Initialize repository
dbht verify <path>            # Verify repository integrity
dbht file-tree <path>         # List project file tree
dbht version [path]           # Show current version
dbht pull <repoPath> <dir>    # Pull project to target directory
```

### Git Remote Sync
```bash
dbht git-connect <path> <url>              # Connect to remote repo
dbht git-connect <path> <url> -b main -u user -t TOKEN

dbht git-pull <path>                       # Pull remote updates
dbht git-pull <path> -u user -t TOKEN

dbht git-push <path> -m "sync message"     # Push to remote
dbht git-push <path> -m "msg" -u user -t TOKEN
```

## AI Workspace

DBHT core philosophy: **Let AI develop freely — every line of code is traceable and rollbackable.**

### AI Agent Integration

Every project managed by DBHT automatically generates two documents:

| File | Purpose |
|------|---------|
| `DBHT-GUIDE.md` | CLI quick reference, version control guide, disaster recovery |
| `DBHT-REQUIREMENTS.md` | Project requirements tracking, feature status, AI workflow spec |

### Auto Permission Configuration

On first entering a project, AI agents auto-configure `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(dbht *)", "Bash(npm *)", "Bash(git *)", "Bash(node *)",
      "Read", "Glob", "Grep", "Edit", "Write"
    ]
  }
}
```

If auto-configuration fails, the AI will prompt the user to manually authorize. If declined, work continues normally.

### Recommended AI Agent Workflow

1. **Understand the project**: Read `DBHT-GUIDE.md` and `DBHT-REQUIREMENTS.md`
2. **Before starting work**: `dbht status <path>` to check current changes
3. **After each feature/fix**: Immediately `dbht commit <path> -m "feat: description"`
4. **View diffs**: `dbht diff <path> -f <file>` to inspect specific changes
5. **Undo mistakes**: `dbht rollback <path> -v <version>`
6. **Remote sync**: `dbht git-pull <path>` / `dbht git-push <path> -m "msg"`

### Semantic Commit Convention

| Type | Format | Example |
|------|--------|---------|
| Feature | `feat: description` | `feat: add user login page` |
| Fix | `fix: description` | `fix: resolve file upload failure` |
| Refactor | `refactor: description` | `refactor: restructure DB connection module` |
| Docs | `docs: description` | `docs: update API documentation` |
| Test | `test: description` | `test: add order module unit tests` |

### AI Commit Tracking

Tag commits with AI source for easy human/AI distinction:

```bash
dbht commit <path> --message "feat: add feature" \
  --ai claude-code \
  --session <session-id> \
  --summary "Purpose and scope of this change"
```

Rollback all commits from a specific AI session:

```bash
dbht rollback-ai <path> --session <session-id>
```

## Ignore Rules

DBHT automatically ignores the following (excluded from version control):
- `.dbvs/` `.dbvs-link.json` — DBHT internal files
- `.git/` — Git remote sync data
- `node_modules/` — Dependency directories
- `.DS_Store` `Thumbs.db` — System files
- All hidden files starting with `.`

## Port Conflict Resolution

```bat
netstat -ano | findstr :3005
taskkill /PID <pid> /F
```

## Recent Updates (Apr–May 2026)

### 🐴 Horse Farm → DeepBlueGodHarnessFarm (Independent App)
- Horse Farm (multi-project development management) extracted into standalone Electron app **DeepBlueGodHarnessFarm / 驾驭工程**
- Reads DBHT project data from filesystem — zero coupling between the two apps
- Features: project list, mind map viewer, knowledge base, task tracker, command center, API key config, version sandbox

### 🧠 Rich Mind Map Viewer
- Tree-layout mind map with SVG connectors and smooth animation
- Drag to pan, scroll to zoom, click to collapse/expand branches
- Auto-generates project design framework from directory structure, not just file listing

### 🔒 Project Notes
- Per-project user notes displayed inline on project cards
- Double-click to open editor popup, auto-saved to `.dbvs-horsefarm-notes.md` in project root
- Notes sync automatically between DBHT and DeepBlueGodHarnessFarm

### 🌐 First-Launch Language Picker
- Mandatory language selection dialog on first app launch (English / 中文)
- Dark gradient overlay with animated flag buttons — blocks UI until language chosen

### 📦 Bundled Node.js 22
- Node.js 22.19.0 portable bundled in `nodejs/` directory
- `start.bat` prepends bundled Node to PATH — zero dependency on system Node.js

### 🏗️ Version Sandbox (DeepBlueGodHarnessFarm)
- Snapshot before AI task, commit on task complete, rollback by AI session
- Task version history viewer — full traceability of AI-generated changes
- Powered by DBHT CLI (`dbgvs`) — zero code coupling

### 🔧 CLI Improvements
- AI-tagged commits with `--ai <tool> --session <id> --summary <text>`
- `rollback-ai` command to batch revert all commits from one AI session
- Structured history output with `getHistoryStructured()`

## Contact & Support

DBHT is free and open-source software. If you find it helpful, your support is greatly appreciated!

<table>
  <tr>
    <td align="center">
      <img src="f9e661730d92fb35985a8d0dffcfb624.jpg" width="180" /><br/>
      <b>WeChat Pay</b>
    </td>
    <td align="center">
      <img src="cd5741cc158ccc6be0b524f0444cc22c.jpg" width="180" /><br/>
      <b>Alipay</b>
    </td>
    <td align="center">
      <img src="94407fbdd42a797af5a902bc107d72e8.jpg" width="180" /><br/>
      <b>WeChat Group</b>
    </td>
  </tr>
</table>

## License

MIT
