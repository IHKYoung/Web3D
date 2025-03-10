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

/**
 * 创建主窗口
 */
function createWindow() {
  // 检查必要的文件是否存在
  const indexPath = path.join(__dirname, 'build/demo/index.html');
  const threeJsPath = path.join(__dirname, 'build/demo/lib/three.module.js');
  const gaussianSplatsPath = path.join(__dirname, 'build/demo/lib/gaussian-splats-3d.module.js');
  
  console.log('检查文件路径:');
  console.log(`index.html: ${indexPath} - 存在: ${fs.existsSync(indexPath)}`);
  console.log(`three.module.js: ${threeJsPath} - 存在: ${fs.existsSync(threeJsPath)}`);
  console.log(`gaussian-splats-3d.module.js: ${gaussianSplatsPath} - 存在: ${fs.existsSync(gaussianSplatsPath)}`);

  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),  // 使用.cjs扩展名的预加载脚本
      // 添加以下设置以支持SharedArrayBuffer
      webSecurity: false,  // 关闭网页安全限制，允许跨源请求
      allowRunningInsecureContent: true,  // 允许运行不安全的内容
      nodeIntegrationInWorker: true,
      // 允许在预加载脚本中使用Node.js API
      sandbox: false
    },
    icon: path.join(__dirname, 'build/demo/assets/images/garden.png')
  });

  // 设置跨源隔离策略，以支持SharedArrayBuffer
  // 这些头等同于HTTP响应头：
  // Cross-Origin-Opener-Policy: same-origin
  // Cross-Origin-Embedder-Policy: require-corp
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
  mainWindow.loadFile(indexPath);
  
  // 打开开发者工具，便于调试
  mainWindow.webContents.openDevTools();

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
        { label: '开发者工具', role: 'toggleDevTools' },
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
              message: 'Gaussian Splats 3D Viewer',
              detail: '基于Three.js的3D高斯点云查看器\n版本: 0.4.7\n作者: Mark Kellogg\n打包: Electron应用',
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
    const url = request.url.substring(6); // 移除 'app://'
    try {
      return callback(path.normalize(path.join(__dirname, 'build/demo', url)));
    } catch (error) {
      console.error('协议处理器错误:', error);
      return callback(404);
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
