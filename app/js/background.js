/**
 * 背景动画模块
 * 创建星空和地形动画效果
 */

// 初始化画布
var background = document.getElementById("bgCanvas"),
  bgCtx = background.getContext("2d"),
  width = window.innerWidth,
  height = document.body.offsetHeight;

(height < 400) ? height = 400 : height;

background.width = width;
background.height = height;

// 创建背景容器
var bgContainer = document.createElement('div');
bgContainer.id = 'background-container';
bgContainer.style.position = 'absolute';
bgContainer.style.top = '0';
bgContainer.style.left = '0';
bgContainer.style.width = '100%';
bgContainer.style.height = '100%';
bgContainer.style.zIndex = '1';
bgContainer.style.pointerEvents = 'none'; // 防止背景遮挡鼠标事件
document.body.appendChild(bgContainer);

// 将背景画布添加到容器中
document.body.removeChild(background);
bgContainer.appendChild(background);

// 存储所有实体
var entities = [];

/**
 * 地形类
 * @param {Object} options 配置选项
 */
function Terrain(options) {
  options = options || {};
  this.terrain = document.createElement("canvas");
  this.terrain.className = 'background-canvas'; // 对应CSS选择器
  this.terCtx = this.terrain.getContext("2d");
  this.scrollDelay = options.scrollDelay || 90;
  this.lastScroll = new Date().getTime();

  this.terrain.width = width;
  this.terrain.height = height;
  this.fillStyle = options.fillStyle || "#191D4C";
  this.mHeight = options.mHeight || height;
  this.displacement = options.displacement || 140;

  this.points = [];
  this.generateTerrain();
  
  // 将地形画布添加到背景容器中
  bgContainer.appendChild(this.terrain);
}

/**
 * 生成地形点
 */
Terrain.prototype.generateTerrain = function() {
  this.points = [];
  var displacement = this.displacement,
      power = Math.pow(2, Math.ceil(Math.log(width) / (Math.log(2))));

  this.points[0] = this.mHeight;
  this.points[power] = this.points[0];

  for (var i = 1; i < power; i *= 2) {
    for (var j = (power / i) / 2; j < power; j += power / i) {
      this.points[j] = ((this.points[j - (power / i) / 2] + this.points[j + (power / i) / 2]) / 2) + Math.floor(Math.random() * -displacement + displacement);
    }
    displacement *= 0.6;
  }
};

/**
 * 调整地形大小
 */
Terrain.prototype.resize = function(newWidth, newHeight) {
  this.terrain.width = newWidth;
  this.terrain.height = newHeight;
  
  // 根据高度比例调整地形高度
  var heightRatio = newHeight / height;
  this.mHeight = this.mHeight * heightRatio;
  
  // 重新生成地形
  this.generateTerrain();
};

/**
 * 更新地形
 */
Terrain.prototype.update = function () {
  this.terCtx.clearRect(0, 0, width, height);
  this.terCtx.fillStyle = this.fillStyle;

  if (new Date().getTime() > this.lastScroll + this.scrollDelay) {
    this.lastScroll = new Date().getTime();
    this.points.push(this.points.shift());
  }

  this.terCtx.beginPath();
  for (var i = 0; i <= width; i++) {
    if (i === 0) {
      this.terCtx.moveTo(0, this.points[0]);
    } else if (this.points[i] !== undefined) {
      this.terCtx.lineTo(i, this.points[i]);
    }
  }

  this.terCtx.lineTo(width, this.terrain.height);
  this.terCtx.lineTo(0, this.terrain.height);
  this.terCtx.lineTo(0, this.points[0]);
  this.terCtx.fill();
};

// 设置背景色
bgCtx.fillStyle = '#05004c';
bgCtx.fillRect(0, 0, width, height);

/**
 * 星星类
 * @param {Object} options 配置选项
 */
function Star(options) {
  this.size = Math.random() * 2;
  this.speed = Math.random() * .05;
  this.x = options.x;
  this.y = options.y;
}

/**
 * 重置星星
 */
Star.prototype.reset = function () {
  this.size = Math.random() * 2;
  this.speed = Math.random() * .05;
  this.x = width;
  this.y = Math.random() * height;
};

/**
 * 更新星星
 */
Star.prototype.update = function () {
  this.x -= this.speed;
  if (this.x < 0) {
    this.reset();
  } else {
    bgCtx.fillRect(this.x, this.y, this.size, this.size);
  }
};

/**
 * 流星类
 */
function ShootingStar() {
  this.reset();
}

/**
 * 重置流星
 */
ShootingStar.prototype.reset = function () {
  this.x = Math.random() * width;
  this.y = 0;
  this.len = (Math.random() * 80) + 10;
  this.speed = (Math.random() * 10) + 6;
  this.size = (Math.random() * 1) + 0.1;
  this.waitTime = new Date().getTime() + (Math.random() * 3000) + 500;
  this.active = false;
};

/**
 * 更新流星
 */
ShootingStar.prototype.update = function () {
  if (this.active) {
    this.x -= this.speed;
    this.y += this.speed;
    if (this.x < 0 || this.y >= height) {
      this.reset();
    } else {
      bgCtx.lineWidth = this.size;
      bgCtx.beginPath();
      bgCtx.moveTo(this.x, this.y);
      bgCtx.lineTo(this.x + this.len, this.y - this.len);
      bgCtx.stroke();
    }
  } else {
    if (this.waitTime < new Date().getTime()) {
      this.active = true;
    }
  }
};

/**
 * 初始化背景
 */
function initBackground() {
  // 清空实体数组
  entities = [];
  
  // 移除现有的地形画布
  var terrains = bgContainer.querySelectorAll('canvas:not(#bgCanvas)');
  for (var t = 0; t < terrains.length; t++) {
    terrains[t].remove();
  }
  
  // 创建星星 - 数量根据屏幕大小动态调整
  var starCount = Math.floor(width * height / 1000); // 根据屏幕面积计算星星数量
  for (var i = 0; i < starCount; i++) {
    entities.push(new Star({
      x: Math.random() * width,
      y: Math.random() * height
    }));
  }

  // 创建流星
  entities.push(new ShootingStar());
  entities.push(new ShootingStar());

  // 创建地形
  entities.push(new Terrain({ mHeight: (height / 2) - 120, displacement: 140 }));
  entities.push(new Terrain({ displacement: 120, scrollDelay: 50, fillStyle: "rgb(17,20,40)", mHeight: (height / 2) - 60 }));
  entities.push(new Terrain({ displacement: 380, scrollDelay: 20, fillStyle: "rgb(10,10,5)", mHeight: height / 2 }));
}

// 初始化背景
initBackground();

/**
 * 动画循环
 */
function animate() {
  bgCtx.fillStyle = '#110E19';
  bgCtx.fillRect(0, 0, width, height);
  bgCtx.fillStyle = '#ffffff';
  bgCtx.strokeStyle = '#ffffff';

  var entLen = entities.length;

  while (entLen--) {
    entities[entLen].update();
  }
  requestAnimationFrame(animate);
}

// 启动动画
animate();

// 窗口大小变化时重新调整画布大小
window.addEventListener('resize', function() {
  var oldWidth = width;
  var oldHeight = height;
  
  width = window.innerWidth;
  height = document.body.offsetHeight;
  (height < 400) ? height = 400 : height;
  
  background.width = width;
  background.height = height;
  
  // 调整背景容器大小
  bgContainer.style.width = width + 'px';
  bgContainer.style.height = height + 'px';
  
  // 如果尺寸变化较大，重新初始化所有元素
  if (Math.abs(width - oldWidth) > oldWidth * 0.2 || Math.abs(height - oldHeight) > oldHeight * 0.2) {
    initBackground();
  } else {
    // 否则只调整现有地形
    for (var i = 0; i < entities.length; i++) {
      if (entities[i] instanceof Terrain) {
        entities[i].resize(width, height);
      }
    }
  }
  
  // 重新设置背景
  bgCtx.fillStyle = '#05004c';
  bgCtx.fillRect(0, 0, width, height);
});
