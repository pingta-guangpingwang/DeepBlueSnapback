const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs-extra')

// 模拟DBVSRepository类
class DBVSRepository {
  async createRepository(folderPath, projectName) {
    try {
      const dbvsPath = path.join(folderPath, '.dbvs')
      await fs.ensureDir(dbvsPath)
      // 创建基本的DBVS结构
      await fs.writeJson(path.join(dbvsPath, 'config.json'), {
        name: projectName,
        version: '1.0.0',
        created: new Date().toISOString()
      })
      await fs.ensureDir(path.join(dbvsPath, 'objects'))
      await fs.ensureDir(path.join(dbvsPath, 'refs'))
      return { success: true, message: `DBVS repository created at ${folderPath}` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}

const dbvsRepo = new DBVSRepository()

// 模拟create-project处理器
async function testCreateProject() {
  const rootPath = 'C:\\Temp\\DBVS_Test_IPC'
  const projectName = 'TestProjectIPC'

  console.log('Testing create-project IPC handler...')

  try {
    const projectsDir = path.join(rootPath, 'projects')
    const repositoriesDir = path.join(rootPath, 'repositories')

    // 确保目录存在
    await fs.ensureDir(projectsDir)
    await fs.ensureDir(repositoriesDir)

    const projectPath = path.join(projectsDir, projectName)
    const repoPath = path.join(repositoriesDir, projectName)

    // 检查项目是否已存在
    if (await fs.pathExists(projectPath)) {
      console.log('✗ Project already exists')
      return { success: false, message: `项目 "${projectName}" 已存在` }
    }

    // 创建项目目录
    await fs.ensureDir(projectPath)
    console.log('✓ Created project directory:', projectPath)

    // 创建对应的仓库目录并初始化DBVS
    await fs.ensureDir(repoPath)
    const result = await dbvsRepo.createRepository(repoPath, projectName)
    console.log('Repository creation result:', result)

    if (result.success) {
      // 创建一个初始的README文件
      const readmePath = path.join(projectPath, 'README.md')
      await fs.writeFile(readmePath, `# ${projectName}\n\n这是一个新的DBVS项目。\n`)
      console.log('✓ Created README file')

      return { success: true, message: `项目 "${projectName}" 创建成功` }
    } else {
      // 如果仓库创建失败，清理项目目录
      await fs.remove(projectPath)
      return result
    }
  } catch (error) {
    console.log('Error:', error)
    return { success: false, message: String(error) }
  }
}

// 运行测试
testCreateProject().then(result => {
  console.log('Final result:', result)
  process.exit(0)
}).catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})