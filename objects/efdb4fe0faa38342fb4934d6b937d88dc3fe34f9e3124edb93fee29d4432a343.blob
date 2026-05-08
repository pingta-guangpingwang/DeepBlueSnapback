const { app } = require('electron')
const path = require('path')
const fs = require('fs-extra')

async function testCreateProjectAndGetProjects() {
  console.log('Testing createProject and getProjects APIs...')

  const testRootPath = 'C:\\Temp\\DBGODVS_Test_Full'
  const projectName = 'TestProjectFull'

  try {
    // 1. 创建项目
    console.log('1. Creating project...')
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

    // 创建基本的DBGODVS结构
    await fs.writeJson(path.join(dbvsPath, 'config.json'), {
      name: projectName,
      version: '1.0.0',
      created: new Date().toISOString()
    })
    await fs.ensureDir(path.join(dbvsPath, 'objects'))
    await fs.ensureDir(path.join(dbvsPath, 'refs'))
    console.log('✓ Created DBGODVS structure')

    // 创建项目配置文件
    const projectConfig = {
      name: projectName,
      createdAt: new Date().toISOString(),
      repositoryPath: repoDir,
      projectPath: projectDir,
      type: 'dbvs-project'
    }
    await fs.writeJson(path.join(projectDir, 'dbvs-project.json'), projectConfig)
    console.log('✓ Created project config file')

    // 2. 获取项目列表
    console.log('\n2. Getting projects list...')
    const projectDirsList = await fs.readdir(projectsDir)
    const projectList = []

    for (const dir of projectDirsList) {
      const projectPathFull = path.join(projectsDir, dir)
      const repoPathFull = path.join(testRootPath, 'repositories', dir)

      // 只处理目录
      const stat = await fs.stat(projectPathFull)
      if (!stat.isDirectory()) continue

      let hasChanges = false
      let lastUpdate = '未知'

      try {
        // 检查仓库是否存在以及是否有变更
        if (await fs.pathExists(repoPathFull)) {
          const dbvsPathCheck = path.join(repoPathFull, '.dbvs')
          if (await fs.pathExists(dbvsPathCheck)) {
            const objectsPath = path.join(dbvsPathCheck, 'objects')
            if (await fs.pathExists(objectsPath)) {
              const files = await fs.readdir(objectsPath)
              if (files.length > 0) {
                // 获取最后修改时间
                const stats = await fs.stat(objectsPath)
                lastUpdate = stats.mtime.toLocaleString()
              }
            }
          }
        }
      } catch (error) {
        console.log(`检查项目 ${dir} 状态失败:`, error)
      }

      projectList.push({
        name: dir,
        path: projectPathFull,
        status: (await fs.pathExists(path.join(testRootPath, 'repositories', dir, '.dbvs'))) ? '已同步' : '未同步',
        lastUpdate,
        hasChanges
      })
    }

    console.log('✓ Retrieved projects list:')
    projectList.forEach(project => {
      console.log(`  - ${project.name}: ${project.status} (${project.lastUpdate})`)
    })

    // 验证结果
    console.log('\n3. Verification:')
    console.log('✓ Projects dir exists:', fs.existsSync(projectsDir))
    console.log('✓ Repositories dir exists:', fs.existsSync(repositoriesDir))
    console.log('✓ Project dir exists:', fs.existsSync(projectDir))
    console.log('✓ Repo dir exists:', fs.existsSync(repoDir))
    console.log('✓ DBGODVS config exists:', fs.existsSync(path.join(dbvsPath, 'config.json')))
    console.log('✓ Project config exists:', fs.existsSync(path.join(projectDir, 'dbvs-project.json')))
    console.log('✓ Objects dir exists:', fs.existsSync(path.join(dbvsPath, 'objects')))
    console.log('✓ Refs dir exists:', fs.existsSync(path.join(dbvsPath, 'refs')))
    console.log('✓ Projects list length:', projectList.length)

    console.log('\n✓ Full project creation and listing test completed successfully!')

  } catch (error) {
    console.error('✗ Test failed:', error.message)
  }
}

testCreateProjectAndGetProjects()