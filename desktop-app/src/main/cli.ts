import parseArgs from 'electron-args';

let binaryName = 'ResponsivelyApp';

if (process.platform === 'darwin') {
  binaryName = '/Applications/ResponsivelyApp.app/Contents/MacOS/ResponsivelyApp';
}

if (process.platform === 'win32') {
  binaryName = 'ResponsivelyApp.exe';
}

const cli = parseArgs(
  `
      ResponsivelyApp
   
      用法
        $ ${binaryName} [path]
   
      选项
        --help     显示帮助
        --version  显示版本
   
      示例
        $ ${binaryName} https://example.com
        $ ${binaryName} /path/to/index.html
  `,
  {
    alias: {
      h: 'help',
    },
  }
);

export default cli;
