/**
 * DBGODVS 核心 VCS 引擎自动化测试
 *
 * 直接通过 Node.js 调用 DBGODVSRepository 类，验证：
 * 1. 创建仓库
 * 2. 提交文件（保存内容到 objects）
 * 3. 获取状态（检测新增/修改/删除）
 * 4. 差异对比
 * 5. 回滚
 * 6. 更新（恢复到最新版本）
 */

const path = require('path')
const fs = require('fs-extra')
const { DBGODVSRepository } = require('./electron/dbvs-repository')

const repo = new DBGODVSRepository()

// 测试根目录
const TEST_ROOT = path.join(require('os').tmpdir(), 'dbvs-test-' + Date.now())
const PROJECT_DIR = path.join(TEST_ROOT, 'test-project')

let passed = 0
let failed = 0

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ ${testName}`)
    passed++
  } else {
    console.log(`  ✗ ${testName}`)
    failed++
  }
}

async function cleanup() {
  await fs.remove(TEST_ROOT)
}

// ==================== 测试 1：创建仓库 ====================
async function testCreateRepository() {
  console.log('\n--- 测试 1：创建仓库 ---')

  await fs.ensureDir(PROJECT_DIR)

  const result = await repo.createRepository(PROJECT_DIR, 'test-project')
  assert(result.success === true, '创建仓库成功')

  const dbvsDir = path.join(PROJECT_DIR, '.dbvs')
  assert(await fs.pathExists(dbvsDir), '.dbvs 目录已创建')
  assert(await fs.pathExists(path.join(dbvsDir, 'config.json')), 'config.json 已创建')
  assert(await fs.pathExists(path.join(dbvsDir, 'objects')), 'objects 目录已创建')
  assert(await fs.pathExists(path.join(dbvsDir, 'commits')), 'commits 目录已创建')
  assert(await fs.pathExists(path.join(dbvsDir, 'HEAD.json')), 'HEAD.json 已创建')

  // 不应能重复创建
  const dupResult = await repo.createRepository(PROJECT_DIR, 'test-project')
  assert(dupResult.success === false, '重复创建返回失败')
}

// ==================== 测试 2：提交文件 ====================
async function testCommit() {
  console.log('\n--- 测试 2：提交文件（保存内容快照）---')

  // 创建测试文件
  await fs.writeFile(path.join(PROJECT_DIR, 'hello.txt'), 'Hello DBGODVS!')
  await fs.writeFile(path.join(PROJECT_DIR, 'readme.md'), '# Test Project')
  await fs.ensureDir(path.join(PROJECT_DIR, 'src'))
  await fs.writeFile(path.join(PROJECT_DIR, 'src', 'index.ts'), 'console.log("test")')

  const result = await repo.commit(PROJECT_DIR, '初始提交', ['hello.txt', 'readme.md', 'src/index.ts'])
  assert(result.success === true, '提交成功')
  assert(result.version !== undefined, `返回版本号: ${result.version}`)

  // 验证 objects 目录下有 blob 文件
  const objectsDir = path.join(PROJECT_DIR, '.dbvs', 'objects')
  const blobFiles = (await fs.readdir(objectsDir)).filter(f => f.endsWith('.blob'))
  assert(blobFiles.length === 3, `保存了 ${blobFiles.length} 个 blob 文件（期望 3）`)

  // 验证 commit JSON
  const commitId = result.version
  const commitPath = path.join(PROJECT_DIR, '.dbvs', 'commits', `${commitId}.json`)
  assert(await fs.pathExists(commitPath), 'commit JSON 文件已创建')

  const commitData = await fs.readJson(commitPath)
  assert(commitData.files.length === 3, `commit 记录了 ${commitData.files.length} 个文件`)
  assert(commitData.files[0].hash !== undefined, '文件记录包含 hash')
  assert(commitData.files[0].size !== undefined, '文件记录包含 size')

  // 验证 HEAD 更新
  const head = await fs.readJson(path.join(PROJECT_DIR, '.dbvs', 'HEAD.json'))
  assert(head.currentVersion === commitId, `HEAD 指向最新提交: ${head.currentVersion}`)
  assert(head.totalCommits === 1, '总提交次数为 1')

  return commitId
}

// ==================== 测试 3：获取状态 ====================
async function testGetStatus() {
  console.log('\n--- 测试 3：获取状态（检测变更）---')

  // 初始状态：没有变更
  let result = await repo.getStatus(PROJECT_DIR)
  assert(result.success === true, '获取状态成功')
  assert(result.status.length === 0, '初始状态无变更')

  // 修改文件
  await fs.writeFile(path.join(PROJECT_DIR, 'hello.txt'), 'Hello DBGODVS! Modified!')

  result = await repo.getStatus(PROJECT_DIR)
  assert(result.status.some(s => s.startsWith('M ')), '检测到修改文件 (M)')

  // 新增文件
  await fs.writeFile(path.join(PROJECT_DIR, 'new-file.txt'), 'New content')

  result = await repo.getStatus(PROJECT_DIR)
  assert(result.status.some(s => s.startsWith('A ')), '检测到新增文件 (A)')

  // 删除文件
  await fs.remove(path.join(PROJECT_DIR, 'readme.md'))

  result = await repo.getStatus(PROJECT_DIR)
  assert(result.status.some(s => s.startsWith('D ')), '检测到删除文件 (D)')
}

// ==================== 测试 4：差异对比 ====================
async function testGetDiff() {
  console.log('\n--- 测试 4：差异对比 ---')

  // 先恢复文件以便测试
  await fs.writeFile(path.join(PROJECT_DIR, 'readme.md'), '# Test Project')
  await fs.writeFile(path.join(PROJECT_DIR, 'hello.txt'), 'Hello DBGODVS! Modified!')

  const result = await repo.getDiff(PROJECT_DIR, 'hello.txt')
  assert(result.success === true, '获取差异成功')
  assert(result.diff.length > 0, '差异内容不为空')
  assert(result.diff.includes('-') || result.diff.includes('+'), '差异包含增删标记')

  // 验证差异内容包含旧内容和新内容
  assert(result.diff.includes('Hello DBGODVS!'), '差异包含旧内容')
  assert(result.diff.includes('Modified'), '差异包含新内容')
}

// ==================== 测试 5：提交第二次 ====================
async function testSecondCommit() {
  console.log('\n--- 测试 5：第二次提交 ---')

  const result = await repo.commit(PROJECT_DIR, '第二次提交', ['hello.txt', 'readme.md', 'src/index.ts', 'new-file.txt'])
  assert(result.success === true, '第二次提交成功')

  const head = await fs.readJson(path.join(PROJECT_DIR, '.dbvs', 'HEAD.json'))
  assert(head.totalCommits === 2, `总提交次数为 2`)

  return result.version
}

// ==================== 测试 6：回滚 ====================
async function testRollback(firstVersion, secondVersion) {
  console.log('\n--- 测试 6：回滚到第一版本 ---')

  const result = await repo.rollback(PROJECT_DIR, firstVersion)
  assert(result.success === true, '回滚成功')

  // 验证文件内容已恢复
  const helloContent = await fs.readFile(path.join(PROJECT_DIR, 'hello.txt'), 'utf-8')
  assert(helloContent === 'Hello DBGODVS!', `hello.txt 内容已恢复: "${helloContent}"`)

  // 验证第二次提交新增的文件已删除
  assert(!(await fs.pathExists(path.join(PROJECT_DIR, 'new-file.txt'))), 'new-file.txt 已被删除（不在第一版本中）')

  // 验证 HEAD 指向回滚版本
  const head = await fs.readJson(path.join(PROJECT_DIR, '.dbvs', 'HEAD.json'))
  assert(head.currentVersion === firstVersion, `HEAD 已指向 ${firstVersion}`)
}

// ==================== 测试 7：更新（恢复到 HEAD 版本）====================
async function testUpdate() {
  console.log('\n--- 测试 7：更新（恢复到 HEAD 版本，丢弃工作区修改）---')

  // 回滚后 HEAD 指向第一版本，hello.txt 内容是 "Hello DBGODVS!"
  // 先修改文件制造差异
  await fs.writeFile(path.join(PROJECT_DIR, 'hello.txt'), 'Some random change')

  const result = await repo.update(PROJECT_DIR)
  assert(result.success === true, '更新成功')

  // update 恢复到 HEAD 版本（第一版本），所以应该是 "Hello DBGODVS!"
  const helloContent = await fs.readFile(path.join(PROJECT_DIR, 'hello.txt'), 'utf-8')
  assert(helloContent === 'Hello DBGODVS!', `hello.txt 已恢复到 HEAD 版本: "${helloContent}"`)
}

// ==================== 测试 8：历史记录 ====================
async function testHistory() {
  console.log('\n--- 测试 8：版本历史 ---')

  const result = await repo.getHistory(PROJECT_DIR)
  assert(result.success === true, '获取历史成功')
  assert(result.history.includes('初始提交'), '历史包含第一次提交')
  assert(result.history.includes('第二次提交'), '历史包含第二次提交')
  assert(result.history.includes('文件:'), '历史包含文件统计')
}

// ==================== 测试 9：仓库信息 ====================
async function testRepositoryInfo() {
  console.log('\n--- 测试 9：仓库信息 ---')

  const result = await repo.getRepositoryInfo(PROJECT_DIR)
  assert(result.success === true, '获取信息成功')
  assert(result.info.includes('test-project'), '信息包含项目名称')
  assert(result.info.includes('提交次数: 2'), '信息包含提交次数')
}

// ==================== 测试 10：删除仓库 ====================
async function testDeleteRepository() {
  console.log('\n--- 测试 10：删除仓库 ---')

  const result = await repo.deleteRepository(PROJECT_DIR)
  assert(result.success === true, '删除成功')
  assert(!(await fs.pathExists(path.join(PROJECT_DIR, '.dbvs'))), '.dbvs 目录已删除')
}

// ==================== 主流程 ====================
async function main() {
  console.log('========================================')
  console.log('  DBGODVS 核心 VCS 引擎自动化测试')
  console.log('========================================')
  console.log(`测试目录: ${TEST_ROOT}`)

  try {
    await testCreateRepository()
    const firstVersion = await testCommit()
    await testGetStatus()
    await testGetDiff()
    const secondVersion = await testSecondCommit()
    await testRollback(firstVersion, secondVersion)
    await testUpdate()
    await testHistory()
    await testRepositoryInfo()
    await testDeleteRepository()

    console.log('\n========================================')
    console.log(`  结果: ${passed} 通过, ${failed} 失败`)
    console.log('========================================')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('\n测试执行出错:', error)
    process.exit(1)
  } finally {
    await cleanup()
    console.log(`\n测试目录已清理: ${TEST_ROOT}`)
  }
}

main()
