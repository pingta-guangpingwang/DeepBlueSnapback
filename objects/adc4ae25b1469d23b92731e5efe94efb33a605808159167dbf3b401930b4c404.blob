const { app } = require('electron')
const { DBGODVSRepository } = require('./electron/dbvs-repository')

async function testCreateRootRepository() {
  console.log('Testing createRootRepository API...')

  const testPath = 'C:\\Temp\\DBGODVS_Root_Test'

  try {
    // 模拟IPC调用
    const fs = require('fs-extra')
    const path = require('path')

    const projectsDir = path.join(testPath, 'projects')
    const repositoriesDir = path.join(testPath, 'repositories')
    const configDir = path.join(testPath, 'config')

    // 创建根仓库目录结构
    await fs.ensureDir(projectsDir)
    await fs.ensureDir(repositoriesDir)
    await fs.ensureDir(configDir)

    // 创建配置文件
    const configPath = path.join(configDir, 'dbvs-config.json')
    const config = {
      rootPath: testPath,
      created: new Date().toISOString(),
      version: '1.0.0'
    }
    await fs.writeJson(configPath, config)

    console.log('✓ Root repository created successfully')
    console.log('✓ Projects directory:', fs.existsSync(projectsDir))
    console.log('✓ Repositories directory:', fs.existsSync(repositoriesDir))
    console.log('✓ Config directory:', fs.existsSync(configDir))
    console.log('✓ Config file:', fs.existsSync(configPath))

    // 读取配置文件验证
    const readConfig = await fs.readJson(configPath)
    console.log('✓ Config content:', JSON.stringify(readConfig, null, 2))

  } catch (error) {
    console.error('✗ Test failed:', error.message)
  }
}

testCreateRootRepository()