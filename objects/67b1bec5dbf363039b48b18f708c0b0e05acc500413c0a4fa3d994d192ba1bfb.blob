/**
 * DBGODVS CLI E2E Test Suite - 全面测试所有 CLI 命令
 */
const { execSync } = require('child_process')
const path = require('path')
const os = require('os')
const fs = require('fs-extra')

const cli = 'node electron/cli-standalone.js'
const configPath = path.join(os.homedir(), '.dbvs', 'config.json')
let rootPath = ''
let passed = 0, failed = 0

function run(cmd) {
  return execSync(cmd, { cwd: 'H:/YunSvn/webRes/深蓝主神', encoding: 'utf8', timeout: 15000 })
}

function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name) }
  catch (e) { failed++; console.log('  ✗ ' + name + ' — ' + e.message) }
}

// ==================== Setup ====================
console.log('\n=== DBGODVS CLI E2E Test Suite ===\n')

const testRoot = path.join(os.tmpdir(), 'dbvs-e2e-test-' + Date.now())

test('set-root', () => {
  const out = run(cli + ' set-root "' + testRoot + '" --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
  rootPath = r.rootPath
})

test('get-root', () => {
  const out = run(cli + ' get-root --format json')
  const r = JSON.parse(out)
  if (!r.success || !r.rootPath) throw new Error('get-root failed')
})

// ==================== Project Management ====================

test('create-project', () => {
  const out = run(cli + ' create-project myapp --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
})

const projPath = path.join(testRoot, 'projects', 'myapp')

// Create test files
fs.writeFileSync(path.join(projPath, 'hello.txt'), 'Hello World')
fs.ensureDirSync(path.join(projPath, 'src'))
fs.writeFileSync(path.join(projPath, 'src/main.js'), 'console.log(1)')

test('list-projects', () => {
  const out = run(cli + ' list-projects --format json')
  const r = JSON.parse(out)
  if (!r.success || !r.projects.some(p => p.name === 'myapp')) throw new Error('myapp not listed')
})

test('list-projects table format', () => {
  const out = run(cli + ' list-projects --format table')
  if (!out.includes('myapp')) throw new Error('table missing project')
})

// ==================== Status & Commit ====================

test('status detects new files', () => {
  const out = run(cli + ' status "' + projPath + '" --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error('status failed')
  if (r.status.length !== 2) throw new Error('expected 2, got ' + r.status.length + ': ' + r.status)
})

test('status table format', () => {
  const out = run(cli + ' status "' + projPath + '" --format table')
  if (!out.includes('新增')) throw new Error('table missing status labels')
})

let v1 = ''
test('commit', () => {
  const out = run(cli + ' commit "' + projPath + '" -m "First commit" --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
  v1 = r.version
})

test('status clean after commit', () => {
  const out = run(cli + ' status "' + projPath + '" --format json')
  const r = JSON.parse(out)
  if (r.status.length !== 0) throw new Error('expected 0 changes, got ' + r.status.length)
})

// ==================== Modify & Diff ====================

fs.writeFileSync(path.join(projPath, 'src/main.js'), 'console.log(2)')
fs.writeFileSync(path.join(projPath, 'new.txt'), 'new file')

test('status detects M and A', () => {
  const out = run(cli + ' status "' + projPath + '" --format json')
  const r = JSON.parse(out)
  const hasM = r.status.some(s => s.startsWith('M '))
  const hasA = r.status.some(s => s.startsWith('A '))
  if (!hasM || !hasA) throw new Error('expected M+A, got: ' + r.status)
})

test('diff shows changes', () => {
  const out = run(cli + ' diff "' + projPath + '" -f src/main.js --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error('diff failed')
  if (!r.diff.includes('+')) throw new Error('no additions in diff')
})

test('diff text format', () => {
  const out = run(cli + ' diff "' + projPath + '" -f src/main.js --format text')
  if (!out.includes('+') && !out.includes('-')) throw new Error('text diff missing markers')
})

let v2 = ''
test('second commit', () => {
  const out = run(cli + ' commit "' + projPath + '" -m "Second commit" --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
  v2 = r.version
})

// ==================== History ====================

test('history has 2 commits', () => {
  const out = run(cli + ' history "' + projPath + '" --format json')
  const r = JSON.parse(out)
  if (!r.success || r.commits.length !== 2) throw new Error('expected 2 commits')
})

test('history table format', () => {
  const out = run(cli + ' history "' + projPath + '" --format table')
  if (!out.includes('版本:')) throw new Error('table missing version info')
})

test('history text format', () => {
  const out = run(cli + ' history "' + projPath + '" --format text')
  if (!out.includes('First commit')) throw new Error('text missing commit msg')
})

// ==================== Info ====================

test('info', () => {
  const out = run(cli + ' info "' + projPath + '" --format json')
  const r = JSON.parse(out)
  if (!r.info.includes('myapp')) throw new Error('info missing name')
  if (!r.info.includes('2')) throw new Error('info wrong commit count')
})

test('info text format', () => {
  const out = run(cli + ' info "' + projPath + '" --format text')
  if (!out.includes('myapp')) throw new Error('text info missing name')
})

// ==================== Verify ====================

test('verify passes', () => {
  const out = run(cli + ' verify "' + projPath + '" --format json')
  const r = JSON.parse(out)
  if (!r.valid) throw new Error('verify failed: ' + r.errors.join(', '))
})

test('verify table format', () => {
  const out = run(cli + ' verify "' + projPath + '" --format table')
  if (!out.includes('✓')) throw new Error('table verify missing checkmark')
})

// ==================== File Tree ====================

test('file-tree', () => {
  const out = run(cli + ' file-tree "' + projPath + '" --format json')
  const r = JSON.parse(out)
  if (!r.success || r.files.length < 3) throw new Error('expected >=3 files')
})

test('file-tree table format', () => {
  const out = run(cli + ' file-tree "' + projPath + '" --format table')
  if (!out.includes('hello.txt')) throw new Error('table missing file')
})

// ==================== Rollback ====================

test('rollback to v1', () => {
  const out = run(cli + ' rollback "' + projPath + '" -v ' + v1 + ' --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
  const content = fs.readFileSync(path.join(projPath, 'src/main.js'), 'utf8')
  if (content !== 'console.log(1)') throw new Error('content not restored: ' + content)
})

test('rollback removes extra files', () => {
  if (fs.pathExistsSync(path.join(projPath, 'new.txt'))) {
    throw new Error('new.txt should have been removed')
  }
})

// ==================== Update ====================

test('update restores to HEAD', () => {
  fs.writeFileSync(path.join(projPath, 'hello.txt'), 'CORRUPTED')
  const out = run(cli + ' update "' + projPath + '" --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
  const content = fs.readFileSync(path.join(projPath, 'hello.txt'), 'utf8')
  if (content !== 'Hello World') throw new Error('update did not restore: ' + content)
})

// ==================== Diff between versions ====================

test('diff between v1 and v2', () => {
  const out = run(cli + ' diff "' + projPath + '" -f src/main.js -a ' + v1 + ' -b ' + v2 + ' --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error('version diff failed')
})

// ==================== Init ====================

test('init arbitrary directory', () => {
  const dir = path.join(os.tmpdir(), 'dbvs-init-' + Date.now())
  fs.ensureDirSync(dir)
  fs.writeFileSync(path.join(dir, 'test.txt'), 'test')
  const out = run(cli + ' init "' + dir + '" --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
  if (!fs.pathExistsSync(path.join(dir, '.dbvs'))) throw new Error('.dbvs not created')
  fs.removeSync(dir)
})

// ==================== Import ====================

test('import-project', () => {
  const src = path.join(os.tmpdir(), 'dbvs-import-' + Date.now())
  fs.ensureDirSync(src)
  fs.writeFileSync(path.join(src, 'data.txt'), 'imported')
  const out = run(cli + ' import-project "' + src + '" --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
  const importedPath = path.join(testRoot, 'projects', path.basename(src))
  if (!fs.pathExistsSync(path.join(importedPath, '.dbvs'))) throw new Error('.dbvs missing')
  if (!fs.pathExistsSync(path.join(importedPath, 'data.txt'))) throw new Error('file not copied')
  fs.removeSync(src)
  fs.removeSync(importedPath)
})

// ==================== Delete ====================

test('delete-project --keep-files', () => {
  run(cli + ' create-project temp-del --format json')
  const tp = path.join(testRoot, 'projects', 'temp-del')
  const out = run(cli + ' delete-project temp-del --keep-files --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
  if (!fs.pathExistsSync(tp)) throw new Error('dir should exist after keep-files')
  if (fs.pathExistsSync(path.join(tp, '.dbvs'))) throw new Error('.dbvs should be removed')
  fs.removeSync(tp)
})

test('delete-project full', () => {
  run(cli + ' create-project temp-del2 --format json')
  const tp = path.join(testRoot, 'projects', 'temp-del2')
  const out = run(cli + ' delete-project temp-del2 --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
  if (fs.pathExistsSync(tp)) throw new Error('dir should be removed')
})

// ==================== Selective commit ====================

test('commit selected files only', () => {
  run(cli + ' create-project selective --format json')
  const sp = path.join(testRoot, 'projects', 'selective')
  fs.writeFileSync(path.join(sp, 'a.txt'), 'a')
  fs.writeFileSync(path.join(sp, 'b.txt'), 'b')
  // commit only a.txt
  const out = run(cli + ' commit "' + sp + '" -m "only a" -f a.txt --format json')
  const r = JSON.parse(out)
  if (!r.success) throw new Error(r.message)
  // b.txt should still show as new
  const sout = run(cli + ' status "' + sp + '" --format json')
  const sr = JSON.parse(sout)
  if (!sr.status.some(s => s.includes('b.txt'))) throw new Error('b.txt should still be untracked')
  fs.removeSync(sp)
})

// ==================== Cleanup ====================

fs.removeSync(testRoot)

console.log('\n========================================')
console.log('  Results: ' + passed + ' passed, ' + failed + ' failed')
console.log('========================================\n')
if (failed > 0) process.exit(1)
