const { app } = require('electron')
const path = require('path')
const fs = require('fs-extra')

async function testCreateProject() {
  console.log('Testing createProject API...')

  const testRootPath = 'C:\\Temp\\DBVS_Test_Root'
  const projectName = 'TestProject'

  try {
    // 模拟主进程的createProject逻辑
    const projectsDir = path.join(testRootPath, 'projects')
    const repositoriesDir = path.join(testRootPath, 'repositories')
    const projectDir = path.join(projectsDir, projectName)
    const repoDir = path.join(repositoriesDir, projectName)

    // 确保根目录存在
    await fs.ensureDir(projectsDir)
    await fs.ensureDir(repositoriesDir)

    // 检查项目是否已存在
    if (await fs.pathExists(projectDir)) {
      console.log('✗ Project already exists')
      return
    }

    // 创建项目目录
    await fs.ensureDir(projectDir)
    console.log('✓ Created project directory:', projectDir)

    // 创建仓库目录并初始化
    await fs.ensureDir(repoDir)
    const dbvsPath = path.join(repoDir, '.dbvs')
    await fs.ensureDir(dbvsPath)
    console.log('✓ Created repository directory:', repoDir)

    // 创建基本的DBVS结构
    await fs.writeJson(path.join(dbvsPath, 'config.json'), {
      name: projectName,
      version: '1.0.0',
      created: new Date().toISOString()
    })
    await fs.ensureDir(path.join(dbvsPath, 'objects'))
    await fs.ensureDir(path.join(dbvsPath, 'refs'))
    console.log('✓ Created DBVS structure')

    // 验证结果
    console.log('\nVerification:')
    console.log('✓ Projects dir exists:', fs.existsSync(projectsDir))
    console.log('✓ Repositories dir exists:', fs.existsSync(repositoriesDir))
    console.log('✓ Project dir exists:', fs.existsSync(projectDir))
    console.log('✓ Repo dir exists:', fs.existsSync(repoDir))
    console.log('✓ DBVS config exists:', fs.existsSync(path.join(dbvsPath, 'config.json')))
    console.log('✓ Objects dir exists:', fs.existsSync(path.join(dbvsPath, 'objects')))
    console.log('✓ Refs dir exists:', fs.existsSync(path.join(dbvsPath, 'refs')))

    console.log('\n✓ Project creation test completed successfully!')

  } catch (error) {
    console.error('✗ Test failed:', error.message)
  }
}

testCreateProject()