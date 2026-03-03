const { execSync } = require('child_process');
const path = require('path');

const npmCli = path.join(
  path.dirname(process.execPath),
  'node_modules',
  'npm',
  'bin',
  'npm-cli.js'
);

console.log('正在安装依赖...');
console.log('npm 路径:', npmCli);

try {
  execSync(`node "${npmCli}" install`, {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('\n依赖安装成功！');
} catch (error) {
  console.error('安装失败:', error.message);
  process.exit(1);
}
