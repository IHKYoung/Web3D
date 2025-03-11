/**
 * Electron主进程文件
 * 负责创建应用窗口并加载Web内容
 */
import { app, BrowserWindow, Menu, dialog, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import url from 'url';

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

// 判断是否为开发环境
// 使用NODE_ENV环境变量来判断
// 当使用npm run dev时，NODE_ENV为development
// 当使用npm run dist或打包后运行时，NODE_ENV为production
const isDevelopment = process.env.NODE_ENV === 'development';

// 打印当前环境变量，便于调试
console.log('当前环境变量 NODE_ENV:', process.env.NODE_ENV);
console.log('是否为开发环境:', isDevelopment);
console.log('是否为打包应用:', app.isPackaged);

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
  let indexPath, threeJsPath, gaussianSplatsPath;
  
  if (fs.existsSync(buildAppDir)) {
    // 优先使用build/app路径
    indexPath = path.join(buildAppDir, 'index.html');
    threeJsPath = path.join(buildAppDir, 'lib/three.module.js');
    gaussianSplatsPath = path.join(buildAppDir, 'lib/gaussian-splats-3d.module.js');
  } else if (fs.existsSync(appDir)) {
    // 如果build/app不存在，则使用app路径
    indexPath = path.join(appDir, 'index.html');
    threeJsPath = path.join(appDir, 'lib/three.module.js');
    gaussianSplatsPath = path.join(appDir, 'lib/gaussian-splats-3d.module.js');
    
    // 如果lib目录不存在，创建它
    const libDir = path.join(appDir, 'lib');
    if (!fs.existsSync(libDir)) {
      console.log('创建lib目录:', libDir);
      fs.mkdirSync(libDir, { recursive: true });
    }
    
    // 如果three.js文件不存在，尝试从node_modules复制
    if (!fs.existsSync(threeJsPath)) {
      const nodeModulesThreePath = path.join(__dirname, 'node_modules/three/build/three.module.js');
      if (fs.existsSync(nodeModulesThreePath)) {
        console.log('复制three.module.js到lib目录');
        fs.copyFileSync(nodeModulesThreePath, threeJsPath);
      }
    }
  } else {
    // 都不存在，使用默认路径
    console.error('警告: 既没有找到build/app目录也没有找到app目录，使用默认路径');
    indexPath = path.join(__dirname, 'build/app/index.html');
    threeJsPath = path.join(__dirname, 'build/app/lib/three.module.js');
    gaussianSplatsPath = path.join(__dirname, 'build/app/lib/gaussian-splats-3d.module.js');
  }
  
  console.log('检查文件路径:');
  console.log(`index.html: ${indexPath} - 存在: ${fs.existsSync(indexPath)}`);
  console.log(`three.module.js: ${threeJsPath} - 存在: ${fs.existsSync(threeJsPath)}`);
  console.log(`gaussian-splats-3d.module.js: ${gaussianSplatsPath} - 存在: ${fs.existsSync(gaussianSplatsPath)}`);

  // 如果index.html不存在，显示错误消息
  if (!fs.existsSync(indexPath)) {
    console.error('错误: index.html文件不存在');
    dialog.showErrorBox('启动错误', `找不到index.html文件: ${indexPath}\n请确保已正确构建应用`);
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
    icon: path.join(__dirname, 'app/assets/icons/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
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
        'Cross-Origin-Embedder-Policy': ['require-corp']
      }
    });
  });

  // 加载应用的index.html
  // 使用loadFile而不是loadURL，直接加载文件路径
  console.log(`加载文件: ${indexPath}`);
  mainWindow.loadFile(indexPath).catch(err => {
    console.error('加载文件失败:', err);
    dialog.showErrorBox('加载错误', `无法加载index.html: ${err.message}`);
  });
  
  // 只在开发环境中打开开发者工具
  if (isDevelopment) {
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
              detail: ' 2025 Manifold Tech Limited\n版本: 0.0.1\n作者: Clarke Young',
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
  });

  // 监听渲染进程中的控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`渲染进程日志 [${level}]: ${message}`);
  });
}

// 注册自定义协议处理器，用于处理本地资源加载
app.whenReady().then(() => {
  // 注册自定义协议处理器，用于处理本地资源加载
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      // 安全地解析URL，避免直接使用substring
      const urlObj = new URL(request.url);
      // 移除协议前缀并解码URI组件
      const urlPath = decodeURIComponent(urlObj.pathname);
      
      // 规范化路径，防止路径遍历攻击
      const normalizedPath = path.normalize(urlPath).replace(/^\/+/, '');
      
      // 尝试两种可能的路径，优先使用build/app
      const buildAppPath = path.join(__dirname, 'build/app', normalizedPath);
      const appPath = path.join(__dirname, 'app', normalizedPath);
      
      // 检查文件是否存在并返回相应路径
      if (fs.existsSync(buildAppPath)) {
        console.log(`找到文件(build/app): ${normalizedPath}`);
        return callback(buildAppPath);
      } else if (fs.existsSync(appPath)) {
        console.log(`找到文件(app): ${normalizedPath}`);
        return callback(appPath);
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
