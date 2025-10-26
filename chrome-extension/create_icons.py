#!/usr/bin/env python3
"""
创建Chrome插件图标
使用PIL生成不同尺寸的图标
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    """创建指定尺寸的图标"""
    # 创建画布
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 背景圆形
    margin = size // 8
    draw.ellipse([margin, margin, size-margin, size-margin], 
                fill=(102, 126, 234, 255), outline=(118, 75, 162, 255), width=2)
    
    # 添加文字或图标
    if size >= 32:
        # 大图标：添加文字
        try:
            font_size = size // 3
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        text = "CH"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (size - text_width) // 2
        y = (size - text_height) // 2
        
        draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    else:
        # 小图标：添加简单图形
        center = size // 2
        radius = size // 4
        
        # 绘制一个简单的"+"号
        line_width = max(1, size // 16)
        draw.line([center-radius, center, center+radius, center], 
                 fill=(255, 255, 255, 255), width=line_width)
        draw.line([center, center-radius, center, center+radius], 
                 fill=(255, 255, 255, 255), width=line_width)
    
    # 保存图标
    img.save(filename, 'PNG')
    print(f"✅ 创建图标: {filename} ({size}x{size})")

def main():
    """主函数"""
    print("🎨 开始创建Chrome插件图标...")
    
    # 确保icons目录存在
    icons_dir = "icons"
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
        print(f"📁 创建目录: {icons_dir}")
    
    # 创建不同尺寸的图标
    sizes = [16, 32, 48, 128]
    
    for size in sizes:
        filename = os.path.join(icons_dir, f"icon{size}.png")
        create_icon(size, filename)
    
    print("🎉 所有图标创建完成！")
    print("\n📋 图标文件列表:")
    for size in sizes:
        filename = os.path.join(icons_dir, f"icon{size}.png")
        if os.path.exists(filename):
            print(f"  ✅ {filename}")
        else:
            print(f"  ❌ {filename}")

if __name__ == "__main__":
    main()
