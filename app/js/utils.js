/**
 * 检测是否为移动设备
 * @returns {boolean} 是否为移动设备
 */
function isMobile() {
  return navigator.userAgent.includes("Mobi");
}

/**
 * 设置错误信息
 * @param {string} msg 错误信息
 */
function setViewError(msg) {
  setViewLoadingIconVisibility(false);
  document.getElementById("viewStatus").innerHTML = "";
  document.getElementById("viewError").innerHTML = msg;
}

/**
 * 设置状态信息
 * @param {string} msg 状态信息
 */
function setViewStatus(msg) {
  setViewLoadingIconVisibility(true);
  document.getElementById("viewError").innerHTML = "";
  document.getElementById("viewStatus").innerHTML = msg;
}

/**
 * 设置加载图标可见性
 * @param {boolean} visible 是否可见
 */
function setViewLoadingIconVisibility(visible) {
  document.getElementById('view-loading-icon').style.display = visible ? 'block' : 'none';
}

/**
 * 处理文件选择变化
 * @param {HTMLInputElement} fileInput 文件输入元素
 * @param {string} fileNameLabelID 文件名标签ID
 */
function onFileChange(fileInput, fileNameLabelID) {
  const fileNameLabel = document.getElementById(fileNameLabelID);
  const url = fileInput.value;
  let lastForwardSlash = url.lastIndexOf('/');
  let lastBackwardSlash = url.lastIndexOf('\\');
  const lastSlash = Math.max(lastForwardSlash, lastBackwardSlash);
  fileNameLabel.innerHTML = url.substring(lastSlash + 1);
}

// 请求动画帧兼容处理
(function() {
  var requestAnimationFrame = window.requestAnimationFrame || 
                              window.mozRequestAnimationFrame || 
                              window.webkitRequestAnimationFrame || 
                              window.msRequestAnimationFrame || 
                              function(callback) {
                                window.setTimeout(callback, 1000 / 60);
                              };
  window.requestAnimationFrame = requestAnimationFrame;
})();

// 导出工具函数
window.utils = {
  isMobile,
  setViewError,
  setViewStatus,
  setViewLoadingIconVisibility,
  onFileChange
};
