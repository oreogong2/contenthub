"""
文件名: image_service.py
作用: 图片处理和OCR文字提取服务
作者: ContentHub Team
日期: 2025-01-27
最后更新: 2025-01-27
"""

import logging
import requests
import os
import uuid
from PIL import Image
import pytesseract
from io import BytesIO
import re
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import time

logger = logging.getLogger(__name__)

def download_image_from_url(url: str, timeout: int = 30) -> str:
    """
    从URL下载图片到本地

    包含完整的安全验证：域名白名单、SSRF 防护、私有 IP 过滤

    参数:
        url (str): 图片URL
        timeout (int): 下载超时时间（秒）

    返回:
        str: 本地图片文件路径

    异常:
        Exception: 当下载失败时
    """
    logger.info(f"开始下载图片: {url}")

    try:
        from url_security import validate_image_url, sanitize_url, URLSecurityError

        # 1. URL 净化
        url = sanitize_url(url)

        # 2. URL 安全验证（域名白名单 + SSRF 防护）
        try:
            validate_image_url(url, check_dns=True)
        except URLSecurityError as e:
            logger.error(f"URL 安全验证失败: {e}")
            raise Exception(f"URL 安全验证失败: {e}")

        # 3. 设置请求头，模拟浏览器
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }

        # 4. 下载图片
        response = requests.get(url, headers=headers, timeout=timeout, stream=True)
        response.raise_for_status()
        
        # 检查内容类型
        content_type = response.headers.get('content-type', '').lower()
        if not content_type.startswith('image/'):
            logger.warning(f"URL不是图片: {content_type}")
            raise Exception(f"URL不是图片格式: {content_type}")
        
        # 生成唯一文件名
        parsed_url = urlparse(url)
        file_ext = os.path.splitext(parsed_url.path)[1]
        if not file_ext:
            # 根据content-type确定扩展名
            if 'jpeg' in content_type or 'jpg' in content_type:
                file_ext = '.jpg'
            elif 'png' in content_type:
                file_ext = '.png'
            elif 'gif' in content_type:
                file_ext = '.gif'
            elif 'webp' in content_type:
                file_ext = '.webp'
            else:
                file_ext = '.jpg'  # 默认
        
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        
        # 确保uploads目录存在
        from config import settings
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        # 保存图片
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # 检查文件大小
        file_size = os.path.getsize(file_path)
        file_size_mb = file_size / (1024 * 1024)
        
        logger.info(f"图片下载成功: {file_path}, 大小: {file_size_mb:.2f} MB")
        
        if file_size_mb > 10:  # 限制10MB
            os.remove(file_path)
            raise Exception("图片文件过大，最大支持10MB")
        
        return file_path
        
    except requests.exceptions.RequestException as e:
        logger.error(f"下载图片失败: {e}")
        raise Exception(f"下载图片失败: {str(e)}")
    except Exception as e:
        logger.error(f"处理图片失败: {e}")
        raise Exception(f"处理图片失败: {str(e)}")

def extract_text_from_image(image_path: str) -> str:
    """
    从图片中提取文字（OCR）
    
    参数:
        image_path (str): 图片文件路径
    
    返回:
        str: 提取的文字内容
    
    异常:
        Exception: 当OCR处理失败时
    """
    logger.info(f"开始OCR文字提取: {image_path}")
    
    try:
        # 检查文件是否存在
        if not os.path.exists(image_path):
            raise Exception(f"图片文件不存在: {image_path}")
        
        # 打开图片
        with Image.open(image_path) as image:
            # 转换为RGB模式（如果需要）
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # 获取图片信息
            width, height = image.size
            logger.info(f"图片尺寸: {width}x{height}")
            
            # 如果图片太小，尝试放大
            if width < 100 or height < 100:
                logger.info("图片尺寸较小，尝试放大")
                scale_factor = max(100 / width, 100 / height)
                new_width = int(width * scale_factor)
                new_height = int(height * scale_factor)
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                logger.info(f"放大后尺寸: {new_width}x{new_height}")
            
            # 使用pytesseract进行OCR
            # 配置OCR参数，支持中英文
            custom_config = r'--oem 3 --psm 6 -l chi_sim+eng'
            
            # 提取文字
            text = pytesseract.image_to_string(image, config=custom_config)
            
            # 清理文字
            text = text.strip()
            
            # 移除多余的空行
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            text = '\n'.join(lines)
            
            word_count = len(text)
            logger.info(f"OCR提取完成: {word_count} 字")
            
            if not text:
                logger.warning("OCR未提取到任何文字")
                return "未检测到文字内容"
            
            return text
            
    except Exception as e:
        logger.error(f"OCR处理失败: {e}")
        raise Exception(f"OCR文字提取失败: {str(e)}")

def extract_images_from_webpage(url: str) -> list:
    """
    从网页中提取图片URL列表
    
    参数:
        url (str): 网页URL
    
    返回:
        list: 图片URL列表
    
    异常:
        Exception: 当网页解析失败时
    """
    logger.info(f"开始解析网页图片: {url}")
    
    try:
        # 设置请求头
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # 获取网页内容
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # 解析HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 提取图片URL
        image_urls = []
        
        # 查找所有img标签
        for img in soup.find_all('img'):
            src = img.get('src') or img.get('data-src') or img.get('data-original')
            if src:
                # 转换为绝对URL
                absolute_url = urljoin(url, src)
                image_urls.append(absolute_url)
        
        # 查找所有可能的图片链接（CSS背景图等）
        for element in soup.find_all(style=True):
            style = element.get('style', '')
            # 匹配background-image: url(...)
            bg_images = re.findall(r'background-image:\s*url\(["\']?([^"\']+)["\']?\)', style)
            for bg_img in bg_images:
                absolute_url = urljoin(url, bg_img)
                image_urls.append(absolute_url)
        
        # 去重
        image_urls = list(set(image_urls))
        
        # 过滤掉明显不是图片的URL
        filtered_urls = []
        for img_url in image_urls:
            # 检查URL是否包含图片扩展名或图片相关关键词
            if (any(ext in img_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']) or
                any(keyword in img_url.lower() for keyword in ['image', 'photo', 'pic', 'img'])):
                filtered_urls.append(img_url)
        
        logger.info(f"找到 {len(filtered_urls)} 个图片URL")
        
        return filtered_urls[:10]  # 限制最多10个图片
        
    except Exception as e:
        logger.error(f"解析网页图片失败: {e}")
        raise Exception(f"解析网页图片失败: {str(e)}")

def process_url_for_images(url: str) -> dict:
    """
    处理URL，提取图片并识别文字
    
    参数:
        url (str): 网页或图片URL
    
    返回:
        dict: {
            'images': [{'url': str, 'text': str, 'file_path': str}],
            'total_text': str,
            'source_type': str
        }
    
    异常:
        Exception: 当处理失败时
    """
    logger.info(f"开始处理URL: {url}")
    
    try:
        # 判断URL类型
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()
        
        # 确定来源类型
        if 'twitter.com' in domain or 'x.com' in domain:
            source_type = 'twitter'
        elif 'xiaohongshu.com' in domain or 'xhslink.com' in domain:
            source_type = 'xiaohongshu'
        elif 'weibo.com' in domain:
            source_type = 'weibo'
        elif 'douyin.com' in domain or 'tiktok.com' in domain:
            source_type = 'douyin'
        else:
            source_type = 'other'
        
        # 检查是否是直接的图片URL
        if any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']):
            logger.info("检测到直接图片URL")
            
            # 下载图片
            image_path = download_image_from_url(url)
            
            # 提取文字
            text = extract_text_from_image(image_path)
            
            return {
                'images': [{
                    'url': url,
                    'text': text,
                    'file_path': image_path
                }],
                'total_text': text,
                'source_type': source_type
            }
        
        else:
            logger.info("检测到网页URL，开始提取图片")
            
            # 从网页提取图片
            image_urls = extract_images_from_webpage(url)
            
            if not image_urls:
                raise Exception("网页中未找到图片")
            
            # 处理每个图片
            processed_images = []
            all_texts = []
            
            for i, img_url in enumerate(image_urls):
                try:
                    logger.info(f"处理第 {i+1}/{len(image_urls)} 个图片: {img_url}")
                    
                    # 下载图片
                    image_path = download_image_from_url(img_url)
                    
                    # 提取文字
                    text = extract_text_from_image(image_path)
                    
                    if text and text != "未检测到文字内容":
                        processed_images.append({
                            'url': img_url,
                            'text': text,
                            'file_path': image_path
                        })
                        all_texts.append(text)
                    
                    # 添加延迟，避免请求过快
                    time.sleep(1)
                    
                except Exception as e:
                    logger.warning(f"处理图片失败 {img_url}: {e}")
                    continue
            
            if not processed_images:
                raise Exception("所有图片都未能提取到文字内容")
            
            # 合并所有文字
            total_text = '\n\n'.join(all_texts)
            
            return {
                'images': processed_images,
                'total_text': total_text,
                'source_type': source_type
            }
        
    except Exception as e:
        logger.error(f"处理URL失败: {e}")
        raise Exception(f"处理URL失败: {str(e)}")

def cleanup_image_files(image_paths: list):
    """
    清理临时图片文件
    
    参数:
        image_paths (list): 图片文件路径列表
    """
    for path in image_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
                logger.info(f"已删除临时文件: {path}")
        except Exception as e:
            logger.warning(f"删除文件失败 {path}: {e}")
