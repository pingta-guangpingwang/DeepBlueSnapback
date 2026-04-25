# DBGODVS — 深蓝主神版本管理系统

Your code's local vault. Version control without the cloud, without the complexity.

DBGODVS is a local version control system built with Electron + React, featuring an SVN-style centralized repository and distributed working copy architecture.

**Put a leash on AI — make every line of generated code traceable.**

## Author

**Wang Guangping (王广平)**

- WeChat: 1084703441
- Email: 18351267631@163.com
- Website: [www.ssrgpt.com](https://www.ssrgpt.com)

> I strive to build connections with the world. This is my information tentacle reaching out globally — let's connect.

## Quick Start

### Development

Double-click `一键启动.bat` or `start.bat` to launch. Dependencies are automatically installed on first run.

### Production

```bash
npm run build && npm run start
```

### CLI Mode

```bash
# Set root repository
dbgvs set-root D:/DBGODVS-Root

# Create a project
dbgvs create-project my-app

# Check status
dbgvs status /path/to/project

# Commit changes
dbgvs commit /path/to/project --message "Fix login bug"
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 8 (port 3005)
- **Desktop**: Electron 28
- **Version Control**: Custom DBGODVS engine (centralized repo + working copy)
- **Git Remote Sync**: isomorphic-git (pull/push/conflict resolution)
- **CLI**: Commander.js (standalone, no Electron GUI required)

## Architecture

```
DBGODVS-Root/                       ← Root repository
├── repositories/                ← Central version stores
│   ├── project-a/               ← Per-project version data
│   │   ├── config.json          ← Repository config
│   │   ├── HEAD.json            ← Current version pointer
│   │   ├── commits/             ← Commit records
│   │   └── objects/             ← File snapshots (content-addressed)
│   └── project-b/
├── projects.json                ← Project registry
└── config/
    └── dbvs-root.json           ← Root config

Working Copy (any location)/
├── .dbvs-link.json              ← Link to central repository
├── DBGODVS-GUIDE.md                ← Version control guide (auto-generated)
├── .git/                        ← (Optional) Git remote sync
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
dbgvs set-root <path>          # Set root repository path
dbgvs get-root                 # Get current root repository path
```

### Project Management
```bash
dbgvs create-project <name>    # Create a new project
dbgvs import-project <src>     # Import an existing folder as a project
dbgvs delete-project <name>    # Delete a project
dbgvs delete-project <name> --keep-files  # Delete version history only, keep files
dbgvs list-projects            # List all projects
dbgvs list-repos               # List all repositories
dbgvs unregister <path>        # Remove from project list
dbgvs unregister <path> --delete-files  # Remove and delete files
```

### Version Control Operations
```bash
dbgvs status [path]            # Show working copy status
dbgvs commit <path> -m "msg"   # Commit changes
dbgvs commit <path> -m "msg" -f file1,file2  # Commit specific files
dbgvs update <path>            # Update to latest version
dbgvs rollback <path> -v v3    # Roll back to specified version
dbgvs history <path>           # View commit history
dbgvs log [path] -n 10         # Show recent N commits
dbgvs diff <path> -f file.ts   # View file diff
dbgvs diff <path> -f file.ts -a v1 -b v2  # Compare two versions
dbgvs info <path>              # Show repository info
dbgvs init <path>              # Initialize repository
dbgvs verify <path>            # Verify repository integrity
dbgvs file-tree <path>         # List project file tree
dbgvs version [path]           # Show current version
dbgvs pull <repoPath> <dir>    # Pull project to target directory
```

### Git Remote Sync
```bash
dbgvs git-connect <path> <url>              # Connect to remote repo
dbgvs git-connect <path> <url> -b main -u user -t TOKEN

dbgvs git-pull <path>                       # Pull remote updates
dbgvs git-pull <path> -u user -t TOKEN

dbgvs git-push <path> -m "sync message"     # Push to remote
dbgvs git-push <path> -m "msg" -u user -t TOKEN
```

## AI Agent Integration

Every project managed by DBGODVS automatically generates a `DBGODVS-GUIDE.md` containing:
- Project metadata (name, path, repository path)
- CLI command quick reference
- Version control operation guidelines

### Recommended AI Agent Workflow

1. **Understand the project**: Read `DBGODVS-GUIDE.md` in the project directory
2. **Before starting work**: `dbvs status <path>` to check current changes
3. **After modifying files**: `dbvs commit <path> -m "Describe changes"`
4. **View diffs**: `dbvs diff <path> -f <file>` to inspect specific changes
5. **Undo mistakes**: `dbvs rollback <path> -v <version>`
6. **Remote sync**: `dbvs git-pull <path>` / `dbvs git-push <path> -m "msg"`

## Ignore Rules

DBGODVS automatically ignores the following (excluded from version control):
- `.dbvs/` `.dbvs-link.json` — DBGODVS internal files
- `.git/` — Git remote sync data
- `node_modules/` — Dependency directories
- `.DS_Store` `Thumbs.db` — System files
- All hidden files starting with `.`

## Port Conflict Resolution

```bat
netstat -ano | findstr :3005
taskkill /PID <pid> /F
```

## Contact & Support

DBGODVS is free and open-source software. If you find it helpful, your support is greatly appreciated!

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
