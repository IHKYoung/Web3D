# 图像处理工具

这个工具用于处理webp图像，裁剪中心80%区域，添加黄金比例倒角，并保存为icon和png格式。

## 功能特点

- 裁剪图像中心80%区域
- 应用黄金比例（约0.618）的圆角
- 生成多尺寸的ICO图标文件
- 同时保存高质量PNG格式

## 使用要求

- Python 3.6+
- Pillow库

## 安装依赖

```bash
pip install pillow
```

## 使用方法

```bash
python image_processor.py input.webp [output_dir]
```

### 参数说明

- `input.webp`: 输入的webp图像文件路径
- `output_dir`: (可选) 输出目录，如果不指定则保存在与输入文件相同的目录中

### 输出文件

工具会生成两个文件：
1. `{原文件名}_processed.png` - 处理后的PNG图像
2. `{原文件名}_processed.ico` - 包含多种尺寸的ICO图标文件

## 示例

```bash
python image_processor.py logo.webp icons
```

这将处理`logo.webp`文件，并将结果保存在`icons`目录中。
