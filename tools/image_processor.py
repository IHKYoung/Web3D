#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
图像处理工具
用于处理webp图像，裁剪中心80%区域，添加黄金比例倒角，并保存为icon和png格式

使用方法：
python image_processor.py input.webp [output_dir]

如果不指定output_dir，则默认保存在与输入文件相同的目录中
"""

import sys
import os
from pathlib import Path
from PIL import Image, ImageDraw
import math

# 黄金比例
GOLDEN_RATIO = (math.sqrt(5) - 1) / 2  # 约0.618

def process_image(input_path, output_dir=None):
    """
    处理图像：裁剪中心80%区域，添加黄金比例倒角，保存为icon和png格式
    
    参数：
        input_path: 输入图像路径
        output_dir: 输出目录，如果为None则使用输入图像所在目录
    
    返回：
        tuple: (png_path, ico_path) 保存的PNG和ICO文件路径
    """
    # 检查输入文件是否存在
    if not os.path.exists(input_path):
        print(f"错误：输入文件 '{input_path}' 不存在")
        return None, None
    
    # 确定输出目录
    if output_dir is None:
        output_dir = os.path.dirname(input_path)
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 获取输入文件名（不含扩展名）
    input_filename = Path(input_path).stem
    
    try:
        # 打开图像
        img = Image.open(input_path)
        
        # 获取原始尺寸
        width, height = img.size
        
        # 计算裁剪区域（中心80%）
        crop_width = int(width * 0.8)
        crop_height = int(height * 0.8)
        left = (width - crop_width) // 2
        top = (height - crop_height) // 2
        right = left + crop_width
        bottom = top + crop_height
        
        # 裁剪图像
        img = img.crop((left, top, right, bottom))
        
        # 创建一个新的RGBA图像（带透明通道）
        new_width, new_height = img.size
        result = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
        
        # 创建一个遮罩图像用于绘制圆角矩形
        mask = Image.new('L', (new_width, new_height), 0)
        draw = ImageDraw.Draw(mask)
        
        # 计算黄金比例倒角的半径
        corner_radius = int(min(new_width, new_height) * GOLDEN_RATIO * 0.5)
        
        # 绘制圆角矩形
        draw.rounded_rectangle(
            [(0, 0), (new_width, new_height)],
            radius=corner_radius,
            fill=255
        )
        
        # 将原图应用到遮罩上
        result.paste(img, (0, 0), mask)
        
        # 保存为PNG
        png_path = os.path.join(output_dir, f"{input_filename}_processed.png")
        result.save(png_path, "PNG")
        
        # 创建不同尺寸的图标
        icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        icons = []
        
        for size in icon_sizes:
            icon = result.copy()
            icon = icon.resize(size, Image.LANCZOS)
            icons.append(icon)
        
        # 保存为ICO
        ico_path = os.path.join(output_dir, f"{input_filename}_processed.ico")
        icons[0].save(
            ico_path, 
            format="ICO", 
            sizes=[(icon.width, icon.height) for icon in icons]
        )
        
        print(f"处理完成！")
        print(f"PNG文件已保存至: {png_path}")
        print(f"ICO文件已保存至: {ico_path}")
        
        return png_path, ico_path
        
    except Exception as e:
        print(f"处理图像时出错: {str(e)}")
        return None, None

def main():
    # 检查命令行参数
    if len(sys.argv) < 2:
        print("使用方法: python image_processor.py input.webp [output_dir]")
        return
    
    input_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None
    
    process_image(input_path, output_dir)

if __name__ == "__main__":
    main()
