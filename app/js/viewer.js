/**
 * 3D查看器功能模块
 */
import * as GaussianSplats3D from 'gaussian-splats-3d';
import * as THREE from 'three';

// 全局变量
let currentAlphaRemovalThreshold;
let currentCameraUpArray;
let currentCameraPositionArray;
let currentCameraLookAtArray;
let currentAntialiased;
let current2DScene;
let currentSphericalHarmonicsDegree;
let currentViewer = null; // 当前查看器实例

/**
 * 将文件缓冲区转换为点云缓冲区
 * @param {Object} fileBufferData 文件缓冲区数据
 * @param {number} format 文件格式
 * @param {number} alphaRemovalThreshold Alpha移除阈值
 * @param {number} compressionLevel 压缩级别
 * @param {number} sectionSize 分区大小
 * @param {Array} sceneCenter 场景中心
 * @param {number} blockSize 块大小
 * @param {number} bucketSize 桶大小
 * @param {number} outSphericalHarmonicsDegree 球谐波级数
 * @returns {Promise} 点云缓冲区承诺
 */
function fileBufferToSplatBuffer(fileBufferData, format, alphaRemovalThreshold, compressionLevel, sectionSize, sceneCenter, blockSize, bucketSize, outSphericalHarmonicsDegree = 0) {
  if (format === GaussianSplats3D.SceneFormat.Ply) {
    return GaussianSplats3D.PlyLoader.loadFromFileData(fileBufferData.data, alphaRemovalThreshold, compressionLevel, outSphericalHarmonicsDegree, sectionSize, sceneCenter, blockSize, bucketSize);
  } else if (format === GaussianSplats3D.SceneFormat.Splat) {
    return GaussianSplats3D.SplatLoader.loadFromFileData(fileBufferData.data, alphaRemovalThreshold, compressionLevel, sectionSize, sceneCenter, blockSize, bucketSize);
  } else {
    return GaussianSplats3D.KSplatLoader.loadFromFileData(fileBufferData.data);
  }
}

/**
 * 查看点云模型
 */
function viewSplat() {
  const viewFile = document.getElementById("viewFile");
  const alphaRemovalThreshold = 1;
  let cameraUpArray = [0, 0, 1];
  let cameraPositionArray = [0, 1, 0];
  let cameraLookAtArray = [1, 0, 0];
  let antialiased = false;
  let sceneIs2D = false;
  let sphericalHarmonicsDegree = 0;

  if (!viewFile.files || viewFile.files.length === 0) {
    window.utils.setViewError("请选择文件。");
    return;
  }

  const file = viewFile.files[0];
  window.utils.setViewStatus("正在加载文件...");
  window.utils.setViewLoadingIconVisibility(true);

  try {
    const reader = new FileReader();
    reader.onload = function() {
      const arrayBuffer = this.result;
      let format;

      const fileExtension = file.name.split('.').pop().toLowerCase();
      console.log(fileExtension);
      if (fileExtension === 'ply') {
        format = GaussianSplats3D.SceneFormat.Ply;
      } else if (fileExtension === 'splat') {
        format = GaussianSplats3D.SceneFormat.Splat;
      } else if (fileExtension === 'mt3d') {
        format = GaussianSplats3D.SceneFormat.Splat;
      } else if (fileExtension === 'ksplat') {
        format = GaussianSplats3D.SceneFormat.KSplat;
      } else {
        window.utils.setViewError("不支持的文件格式。");
        window.utils.setViewLoadingIconVisibility(false);
        return;
      }

      currentAlphaRemovalThreshold = alphaRemovalThreshold;
      currentCameraUpArray = cameraUpArray;
      currentCameraPositionArray = cameraPositionArray;
      currentCameraLookAtArray = cameraLookAtArray;
      currentAntialiased = antialiased;
      current2DScene = sceneIs2D;
      currentSphericalHarmonicsDegree = sphericalHarmonicsDegree;

      runViewer(arrayBuffer, format, alphaRemovalThreshold, cameraUpArray, cameraPositionArray, cameraLookAtArray, antialiased, sceneIs2D, sphericalHarmonicsDegree);
    };

    reader.readAsArrayBuffer(file);
  } catch (e) {
    console.error(e);
    window.utils.setViewError("无法查看场景。");
  }
}

/**
 * 运行查看器
 * @param {ArrayBuffer} splatBufferData 点云缓冲区数据
 * @param {number} format 文件格式
 * @param {number} alphaRemovalThreshold Alpha移除阈值
 * @param {Array} cameraUpArray 相机上方向数组
 * @param {Array} cameraPositionArray 相机位置数组
 * @param {Array} cameraLookAtArray 相机视点数组
 * @param {boolean} antialiased 是否抗锯齿
 * @param {boolean} sceneIs2D 是否为2D场景
 * @param {number} sphericalHarmonicsDegree 球谐波级数
 */
function runViewer(splatBufferData, format, alphaRemovalThreshold, cameraUpArray, cameraPositionArray, cameraLookAtArray, antialiased, sceneIs2D, sphericalHarmonicsDegree) {
  const viewerOptions = {
    'cameraUp': cameraUpArray,
    'initialCameraPosition': cameraPositionArray,
    'initialCameraLookAt': cameraLookAtArray,
    'halfPrecisionCovariancesOnGPU': false,
    'antialiased': antialiased || false,
    'splatRenderMode': sceneIs2D ? GaussianSplats3D.SplatRenderMode.TwoD : GaussianSplats3D.SplatRenderMode.ThreeD,
    'sphericalHarmonicsDegree': sphericalHarmonicsDegree
  };
  const splatBufferOptions = {
    'splatAlphaRemovalThreshold': alphaRemovalThreshold
  };
  const splatBufferPromise = fileBufferToSplatBuffer({ data: splatBufferData }, format, alphaRemovalThreshold, 0,
    undefined, undefined, undefined, undefined, sphericalHarmonicsDegree);
  splatBufferPromise.then((splatBuffer) => {
    document.getElementById("cloud-container").style.display = 'none';
    document.body.style.backgroundColor = "#000000";
    
    // 隐藏背景容器
    const bgContainer = document.getElementById('background-container');
    if (bgContainer) {
      bgContainer.style.display = 'none';
    }
    
    // 删除所有的 <canvas> 元素
    const allCanvases = document.querySelectorAll('canvas');
    allCanvases.forEach(canvas => canvas.remove());
    
    history.pushState("ViewSplat", null);
    const viewer = new GaussianSplats3D.Viewer(viewerOptions);
    currentViewer = viewer; // 保存查看器实例
    
    viewer.addSplatBuffers([splatBuffer], [splatBufferOptions])
      .then(() => {
        // 为点云查看器创建的canvas添加类名
        const viewerCanvas = document.querySelector('canvas');
        if (viewerCanvas) {
          viewerCanvas.className = 'viewer-canvas';
        }
        
        viewer.start();
        window.utils.setViewLoadingIconVisibility(false);
        window.utils.setViewStatus("场景加载成功。");
        
        // 显示工具栏
        showViewerToolbar();
      });
  });
}

/**
 * 显示查看器工具栏
 */
function showViewerToolbar() {
  const toolbar = document.getElementById('viewer-toolbar');
  if (toolbar) {
    toolbar.classList.remove('hidden');
  }
}

/**
 * 隐藏查看器工具栏
 */
function hideViewerToolbar() {
  const toolbar = document.getElementById('viewer-toolbar');
  if (toolbar) {
    toolbar.classList.add('hidden');
  }
}

/**
 * 返回到文件选择界面
 */
function backToFileSelection() {
  // 停止当前查看器
  if (currentViewer) {
    currentViewer.dispose();
    currentViewer = null;
  }
  
  // 显示文件选择容器
  document.getElementById("cloud-container").style.display = 'block';
  
  // 显示背景容器
  const bgContainer = document.getElementById('background-container');
  if (bgContainer) {
    bgContainer.style.display = 'block';
  }
  
  // 隐藏工具栏
  hideViewerToolbar();
  
  // 恢复背景颜色
  document.body.style.backgroundColor = "";
  
  // 确保背景画布存在
  let bgCanvas = document.getElementById('bgCanvas');
  if (!bgCanvas) {
    bgCanvas = document.createElement('canvas');
    bgCanvas.id = 'bgCanvas';
    if (bgContainer) {
      bgContainer.appendChild(bgCanvas);
    } else {
      document.body.insertBefore(bgCanvas, document.body.firstChild);
    }
  }
  
  // 重新初始化背景
  if (typeof initBackground === 'function') {
    initBackground();
  }
  
  // 更新历史记录
  window.utils.setViewLoadingIconVisibility(false);
  window.utils.setViewStatus("");
  window.utils.setViewError("");
  
  // 清空文件选择输入框
  const viewFileInput = document.getElementById("viewFile");
  if (viewFileInput) {
    viewFileInput.value = "";
    document.getElementById("viewFileName").textContent = "(No file chosen)";
  }
  
  // 更新历史记录
  history.pushState("FileSelection", null);
}

/**
 * 截图功能
 */
function takeScreenshot() {
  if (!currentViewer) return;
  
  try {
    // 隐藏工具栏以便截图
    const toolbar = document.getElementById('viewer-toolbar');
    if (toolbar) toolbar.style.display = 'none';
    
    // 获取canvas元素
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.error('找不到canvas元素');
      return;
    }
    
    // 创建下载链接
    const link = document.createElement('a');
    link.download = 'mindcloud-screenshot-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.png';
    
    // 将canvas内容转换为数据URL
    link.href = canvas.toDataURL('image/png');
    
    // 模拟点击下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 恢复工具栏显示
    if (toolbar) toolbar.style.display = '';
  } catch (error) {
    console.error('截图失败:', error);
  }
}

/**
 * 测量功能
 */
function toggleMeasurement() {
  // 这里是测量功能的实现
  // 由于需要与Three.js和GaussianSplats3D进行深度集成
  // 这里只是一个占位实现
  alert('测量功能正在开发中...');
}

/**
 * 切换地形显示
 */
function toggleTerrainDisplay() {
  // 调用background.js中的toggleTerrain函数
  if (typeof window.toggleTerrain === 'function') {
    // 获取当前地形显示状态并切换
    const showTerrain = document.querySelector('.terrain-visible') === null;
    window.toggleTerrain(showTerrain);
    
    // 更新按钮状态
    const terrainButton = document.getElementById('btn-toggle-background');
    if (terrainButton) {
      if (showTerrain) {
        terrainButton.classList.add('terrain-visible');
        terrainButton.textContent = '隐藏背景';
      } else {
        terrainButton.classList.remove('terrain-visible');
        terrainButton.textContent = '显示背景';
      }
    }
  }
}

// 导出函数
window.viewSplat = viewSplat;

// 添加文件选择事件
document.getElementById("viewFile").addEventListener("change", function() {
  const fileName = this.files[0] ? this.files[0].name : "(No file chosen)";
  document.getElementById("viewFileName").textContent = fileName;
});

// 添加查看按钮事件
document.querySelector(".btn-view").addEventListener("click", function() {
  viewSplat();
});

// 添加工具栏按钮事件
document.addEventListener('DOMContentLoaded', function() {
  // 返回按钮
  document.getElementById('btn-back').addEventListener('click', backToFileSelection);
  
  // 测量按钮
  document.getElementById('btn-measure').addEventListener('click', toggleMeasurement);
  
  // 截图按钮
  document.getElementById('btn-screenshot').addEventListener('click', takeScreenshot);
  
  // 切换地形按钮
  document.getElementById('btn-toggle-background').addEventListener('click', toggleTerrainDisplay);
});

// 添加窗口大小变化事件处理
window.addEventListener('resize', function() {
  // 如果点云已经打开，不需要重新显示背景
  const bgContainer = document.getElementById('background-container');
  if (bgContainer && bgContainer.style.display === 'none') {
    return; // 如果背景已经隐藏，说明点云已经打开，不需要处理
  }
});
