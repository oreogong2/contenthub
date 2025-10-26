#!/usr/bin/env python3
"""
OCR功能测试脚本
用于验证Tesseract OCR是否正确安装和配置
"""

import os
import sys
import logging
from PIL import Image
import pytesseract

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_tesseract_installation():
    """测试Tesseract是否正确安装"""
    logger.info("🔍 测试Tesseract安装...")
    
    try:
        # 检查tesseract命令
        version = pytesseract.get_tesseract_version()
        logger.info(f"✅ Tesseract版本: {version}")
        
        # 检查可用语言
        langs = pytesseract.get_languages()
        logger.info(f"✅ 可用语言: {', '.join(langs)}")
        
        # 检查中文支持
        if 'chi_sim' in langs:
            logger.info("✅ 简体中文支持: 已安装")
        else:
            logger.warning("⚠️ 简体中文支持: 未安装")
            
        if 'eng' in langs:
            logger.info("✅ 英文支持: 已安装")
        else:
            logger.warning("⚠️ 英文支持: 未安装")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Tesseract测试失败: {e}")
        return False

def test_image_processing():
    """测试图片处理功能"""
    logger.info("🖼️ 测试图片处理...")
    
    try:
        # 创建一个简单的测试图片
        from PIL import Image, ImageDraw, ImageFont
        
        # 创建白色背景图片
        img = Image.new('RGB', (400, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        # 添加文字
        try:
            # 尝试使用系统字体
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
        except:
            # 使用默认字体
            font = ImageFont.load_default()
        
        draw.text((50, 50), "Hello World", fill='black', font=font)
        draw.text((50, 100), "测试中文", fill='black', font=font)
        
        # 保存测试图片
        test_image_path = "test_image.png"
        img.save(test_image_path)
        logger.info(f"✅ 测试图片已创建: {test_image_path}")
        
        return test_image_path
        
    except Exception as e:
        logger.error(f"❌ 图片处理测试失败: {e}")
        return None

def test_ocr_recognition(image_path):
    """测试OCR识别功能"""
    logger.info("🔤 测试OCR识别...")
    
    try:
        # 打开图片
        with Image.open(image_path) as image:
            # 测试英文识别
            english_text = pytesseract.image_to_string(image, lang='eng')
            logger.info(f"✅ 英文识别结果: '{english_text.strip()}'")
            
            # 测试中英文混合识别
            mixed_text = pytesseract.image_to_string(image, lang='chi_sim+eng')
            logger.info(f"✅ 中英文识别结果: '{mixed_text.strip()}'")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ OCR识别测试失败: {e}")
        return False

def cleanup_test_files(image_path):
    """清理测试文件"""
    try:
        if os.path.exists(image_path):
            os.remove(image_path)
            logger.info(f"✅ 已清理测试文件: {image_path}")
    except Exception as e:
        logger.warning(f"⚠️ 清理文件失败: {e}")

def main():
    """主测试函数"""
    logger.info("🚀 开始OCR功能测试...")
    
    # 测试Tesseract安装
    if not test_tesseract_installation():
        logger.error("❌ Tesseract安装测试失败，请检查安装")
        sys.exit(1)
    
    # 测试图片处理
    test_image_path = test_image_processing()
    if not test_image_path:
        logger.error("❌ 图片处理测试失败")
        sys.exit(1)
    
    # 测试OCR识别
    if not test_ocr_recognition(test_image_path):
        logger.error("❌ OCR识别测试失败")
        cleanup_test_files(test_image_path)
        sys.exit(1)
    
    # 清理测试文件
    cleanup_test_files(test_image_path)
    
    logger.info("🎉 所有测试通过！OCR功能已就绪。")
    logger.info("💡 现在可以使用链接素材提取功能了。")

if __name__ == "__main__":
    main()
