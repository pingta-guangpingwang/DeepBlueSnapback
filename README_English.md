# DBVS — DeepBlue Version System

Your code's local vault. Version control without the cloud, without the complexity.

DBVS is a local version control system built with Electron + React, featuring an SVN-style centralized repository and distributed working copy architecture.

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
dbvs set-root D:/DBVS-Root

# Create a project
dbvs create-project my-app

# Check status
dbvs status /path/to/project

# Commit changes
dbvs commit /path/to/project --message "Fix login bug"
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 8 (port 3005)
- **Desktop**: Electron 28
- **Version Control**: Custom DBVS engine (centralized repo + working copy)
- **Git Remote Sync**: isomorphic-git (pull/push/conflict resolution)
- **CLI**: Commander.js (standalone, no Electron GUI required)

## Architecture

```
DBVS-Root/                       ← Root repository
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
├── DBVS-GUIDE.md                ← Version control guide (auto-generated)
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
dbvs set-root <path>          # Set root repository path
dbvs get-root                 # Get current root repository path
```

### Project Management
```bash
dbvs create-project <name>    # Create a new project
dbvs import-project <src>     # Import an existing folder as a project
dbvs delete-project <name>    # Delete a project
dbvs delete-project <name> --keep-files  # Delete version history only, keep files
dbvs list-projects            # List all projects
dbvs list-repos               # List all repositories
dbvs unregister <path>        # Remove from project list
dbvs unregister <path> --delete-files  # Remove and delete files
```

### Version Control Operations
```bash
dbvs status [path]            # Show working copy status
dbvs commit <path> -m "msg"   # Commit changes
dbvs commit <path> -m "msg" -f file1,file2  # Commit specific files
dbvs update <path>            # Update to latest version
dbvs rollback <path> -v v3    # Roll back to specified version
dbvs history <path>           # View commit history
dbvs log [path] -n 10         # Show recent N commits
dbvs diff <path> -f file.ts   # View file diff
dbvs diff <path> -f file.ts -a v1 -b v2  # Compare two versions
dbvs info <path>              # Show repository info
dbvs init <path>              # Initialize repository
dbvs verify <path>            # Verify repository integrity
dbvs file-tree <path>         # List project file tree
dbvs version [path]           # Show current version
dbvs pull <repoPath> <dir>    # Pull project to target directory
```

### Git Remote Sync
```bash
dbvs git-connect <path> <url>              # Connect to remote repo
dbvs git-connect <path> <url> -b main -u user -t TOKEN

dbvs git-pull <path>                       # Pull remote updates
dbvs git-pull <path> -u user -t TOKEN

dbvs git-push <path> -m "sync message"     # Push to remote
dbvs git-push <path> -m "msg" -u user -t TOKEN
```

## AI Agent Integration

Every project managed by DBVS automatically generates a `DBVS-GUIDE.md` containing:
- Project metadata (name, path, repository path)
- CLI command quick reference
- Version control operation guidelines

### Recommended AI Agent Workflow

1. **Understand the project**: Read `DBVS-GUIDE.md` in the project directory
2. **Before starting work**: `dbvs status <path>` to check current changes
3. **After modifying files**: `dbvs commit <path> -m "Describe changes"`
4. **View diffs**: `dbvs diff <path> -f <file>` to inspect specific changes
5. **Undo mistakes**: `dbvs rollback <path> -v <version>`
6. **Remote sync**: `dbvs git-pull <path>` / `dbvs git-push <path> -m "msg"`

## Ignore Rules

DBVS automatically ignores the following (excluded from version control):
- `.dbvs/` `.dbvs-link.json` — DBVS internal files
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

DBVS is free and open-source software. If you find it helpful, your support is greatly appreciated!

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
