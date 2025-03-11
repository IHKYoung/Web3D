/**
 * Electron主进程文件
 * 负责创建应用窗口并加载Web内容
 */
import { app, BrowserWindow, Menu, dialog, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import url from 'url';
import os from 'os';

// 设置内存限制，设为系统内存的一半
// 注意：此设置只在应用启动时生效，不能在运行时修改
const totalMem = os.totalmem() / (1024 * 1024 * 1024); // 转换为GB
const memLimit = Math.min(8, Math.floor(totalMem / 2)); // 8GB 和 系统内存的一半 选最小
app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${memLimit * 1024}`);

// 获取__dirname和__filename
// ES模块中不直接提供__dirname和__filename内置变量
// 需要使用import.meta.url来获取当前模块的URL，然后使用fileURLToPath将URL转换为文件路径
// 使用path.dirname获取目录路径
// 这样就可以在ES模块中使用__dirname和__filename的替代
// 详见Node.js文档
// https://nodejs.org/api/esm.html#no-__filename-or-__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 保持对window对象的全局引用，避免JavaScript对象被垃圾回收时，窗口被自动关闭
let mainWindow;

// 使用NODE_ENV环境变量来判断
// 当使用npm run dev时，NODE_ENV为development
// 当使用npm run dist或打包后运行时，NODE_ENV为production

// 开发环境检测
// 主要依赖NODE_ENV环境变量，同时考虑打包状态作为备选判断
const isDevelopment = process.env.NODE_ENV === 'development';

// 打印当前环境变量，便于调试
console.log('当前环境变量 NODE_ENV:', process.env.NODE_ENV);
console.log('是否为开发环境:', isDevelopment);
console.log('是否为打包应用:', app.isPackaged);

/**
 * 解析应用路径，优先使用build/app目录
 * @param {string} relativePath - 相对路径
 * @returns {string|null} - 返回绝对路径或null（如果文件不存在）
 */
function resolveAppPath(relativePath) {
  // 尝试两种可能的路径，优先使用build/app
  const buildAppPath = path.join(__dirname, 'build/app', relativePath);
  const appPath = path.join(__dirname, 'app', relativePath);
  
  if (fs.existsSync(buildAppPath)) {
    return buildAppPath;
  } else if (fs.existsSync(appPath)) {
    return appPath;
  }
  return null;
}

/**
 * 创建主窗口
 */
function createWindow() {
  // 检查必要的文件是否存在
  const buildAppDir = path.join(__dirname, 'build/app');
  const appDir = path.join(__dirname, 'app');
  
  console.log('当前目录:', __dirname);
  console.log('检查build/app目录是否存在:', fs.existsSync(buildAppDir));
  console.log('检查app目录是否存在:', fs.existsSync(appDir));
  
  // 尝试两种可能的路径，优先使用build/app
  const indexPath = resolveAppPath('index.html');
  const threeJsPath = resolveAppPath('lib/three.module.js');
  const gaussianSplatsPath = resolveAppPath('lib/gaussian-splats-3d.module.js');
  
  if (!indexPath) {
    // 如果index.html不存在，创建app目录和lib目录
    if (!fs.existsSync(appDir)) {
      console.log('创建app目录:', appDir);
      fs.mkdirSync(appDir, { recursive: true });
    }
    
    const libDir = path.join(appDir, 'lib');
    if (!fs.existsSync(libDir)) {
      console.log('创建lib目录:', libDir);
      fs.mkdirSync(libDir, { recursive: true });
    }
    
    // 如果three.js文件不存在，尝试从node_modules复制
    const nodeModulesThreePath = path.join(__dirname, 'node_modules/three/build/three.module.js');
    if (fs.existsSync(nodeModulesThreePath)) {
      const targetThreePath = path.join(libDir, 'three.module.js');
      console.log('复制three.module.js到lib目录');
      fs.copyFileSync(nodeModulesThreePath, targetThreePath);
    }
  }
  
  // 检查文件路径
  const finalIndexPath = resolveAppPath('index.html');
  console.log('检查文件路径:');
  console.log(`index.html: ${finalIndexPath || '不存在'}`);
  console.log(`three.module.js: ${threeJsPath || '不存在'}`);
  console.log(`gaussian-splats-3d.module.js: ${gaussianSplatsPath || '不存在'}`);

  // 如果index.html不存在，显示错误消息
  if (!finalIndexPath) {
    console.error('错误: index.html文件不存在');
    dialog.showErrorBox('启动错误', `找不到index.html文件\n请确保已正确构建应用`);
    app.quit();
    return;
  }

  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800, 
    minHeight: 600,
    title: 'MindCloud 3DViewer',
    icon: resolveAppPath('assets/images/mt3d.png') || path.join(__dirname, 'app/assets/images/mt3d.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // 在开发环境下允许不安全的内容
      webSecurity: !isDevelopment,
      // 在开发环境下允许运行不安全的内容
      allowRunningInsecureContent: isDevelopment,
      nodeIntegrationInWorker: true,
      sandbox: false
    }
  });

  // 强制设置最小窗口尺寸
  mainWindow.setMinimumSize(800, 600);

  // 监听窗口大小变化，确保不小于最小尺寸
  mainWindow.on('resize', () => {
    const size = mainWindow.getSize();
    let [width, height] = size;
    let resized = false;
    
    if (width < 800) {
      width = 800;
      resized = true;
    }
    
    if (height < 600) {
      height = 600;
      resized = true;
    }
    
    if (resized) {
      mainWindow.setSize(width, height);
    }
  });

  // 设置跨源隔离策略，以支持SharedArrayBuffer
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
        // 内容安全策略，开发环境下允许不安全的内联脚本和eval，生产环境下也允许内联脚本但不允许eval
        // 允许加载本地字体资源
        // 允许 worker-src 'self' blob:
        'Content-Security-Policy': [isDevelopment ? 
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:" : 
          "default-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:"]
      }
    });
  });

  // 加载应用的index.html
  console.log(`加载文件: ${finalIndexPath}`);
  mainWindow.loadFile(finalIndexPath).catch(err => {
    console.error('加载文件失败:', err);
    dialog.showErrorBox('加载错误', `无法加载index.html: ${err.message}`);
  });
  
  // 如果是开发环境且不是打包应用，打开开发者工具
  if ((isDevelopment && !app.isPackaged) || process.argv.includes('--devtools')) {
    console.log('开发环境: 打开开发者工具');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('生产环境: 不打开开发者工具');
  }

  // 创建菜单
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        // 只在开发环境中显示开发者工具菜单项
        ...(isDevelopment ? [{ label: '开发者工具', role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: '关于',
              message: 'MindCloud 3DViewer',
              detail: '\u00A9 2025 Manifold Tech Limited\n版本: 0.0.1\n作者: Clarke Young',
              buttons: ['确定']
            });
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 当window被关闭时，触发下面的事件
  mainWindow.on('closed', function () {
    // 取消引用window对象，通常如果应用支持多窗口，会将windows存储在数组中，
    // 这时应该删除相应的元素
    mainWindow = null;
  });

  // 监听渲染进程中的错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`加载失败: ${errorCode} - ${errorDescription}`);
    dialog.showErrorBox('加载错误', `页面加载失败: ${errorDescription}\n错误代码: ${errorCode}`);
  });

  // 监听渲染进程中的控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`渲染进程日志 [${level}]: ${message}`);
  });
}

// 注册自定义协议处理器，用于处理本地资源加载
app.whenReady().then(() => {
  // 注册自定义协议处理器
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      // 安全地解析URL，避免直接使用substring
      const urlObj = new URL(request.url);
      // 移除协议前缀并解码URI组件
      const urlPath = decodeURIComponent(urlObj.pathname);
      
      // 规范化路径，防止路径遍历攻击
      const normalizedPath = path.normalize(urlPath).replace(/^\/+/, '');
      
      // 尝试两种可能的路径，优先使用build/app
      const filePath = resolveAppPath(normalizedPath);
      
      if (filePath) {
        console.log(`找到文件: ${normalizedPath}`);
        return callback(filePath);
      } else {
        console.error(`找不到文件: ${normalizedPath}`);
        // 返回404错误，并提供更详细的错误信息
        return callback({ error: -6, statusCode: 404 });
      }
    } catch (error) {
      console.error('协议处理器错误:', error);
      // 返回500错误，表示服务器内部错误
      return callback({ error: -2, statusCode: 500 });
    }
  });

  // 创建窗口
  createWindow();

  app.on('activate', function () {
    // 在macOS上，当dock图标被点击且没有其他窗口打开时，通常会在应用程序中重新创建一个窗口
    if (mainWindow === null) createWindow();
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  // 在macOS上，用户通常期望点击dock图标时应用会重新打开窗口
  if (process.platform !== 'darwin') app.quit();
});
