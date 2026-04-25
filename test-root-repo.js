const fs = require('fs');
const path = require('path');

function testRootRepositoryCreation() {
  const testRootPath = 'C:\\Temp\\DBVS_Test';

  console.log('Testing root repository creation...');
  console.log('Test root path:', testRootPath);

  try {
    // 创建根仓库目录结构
    const projectsDir = path.join(testRootPath, 'projects');
    const repositoriesDir = path.join(testRootPath, 'repositories');
    const configDir = path.join(testRootPath, 'config');

    console.log('Creating directories...');

    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
      console.log('✓ Created projects directory');
    }

    if (!fs.existsSync(repositoriesDir)) {
      fs.mkdirSync(repositoriesDir, { recursive: true });
      console.log('✓ Created repositories directory');
    }

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log('✓ Created config directory');
    }

    // 验证目录结构
    console.log('\nVerifying directory structure...');
    const dirs = ['projects', 'repositories', 'config'];
    dirs.forEach(dir => {
      const dirPath = path.join(testRootPath, dir);
      if (fs.existsSync(dirPath)) {
        console.log(`✓ ${dir} directory exists`);
      } else {
        console.log(`✗ ${dir} directory missing`);
      }
    });

    console.log('\nRoot repository creation test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testRootRepositoryCreation();