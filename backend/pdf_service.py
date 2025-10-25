"""
文件名: pdf_service.py
作用: PDF 文件处理服务
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

import logging
import pdfplumber
import os

logger = logging.getLogger(__name__)

def extract_text_from_pdf(file_path: str):
    """
    从 PDF 提取文本
    
    这个函数会逐页提取 PDF 中的文字内容，适用于文本版 PDF。
    注意：不支持扫描版（图片型）PDF。
    
    参数:
        file_path (str): PDF 文件路径
    
    返回:
        str: 提取的文本内容
    
    异常:
        FileNotFoundError: 当文件不存在时
        Exception: 当 PDF 解析失败时
    """
    logger.info(f"开始处理 PDF: {file_path}")
    
    # 1. 检查文件是否存在
    if not os.path.exists(file_path):
        logger.error(f"PDF 文件不存在: {file_path}")
        raise FileNotFoundError(f"PDF 文件不存在: {file_path}")
    
    # 2. 获取文件大小
    file_size = os.path.getsize(file_path)
    file_size_mb = file_size / (1024 * 1024)
    logger.info(f"PDF 文件大小: {file_size_mb:.2f} MB")
    
    try:
        # 3. 打开 PDF 文件
        # pdfplumber 会自动处理编码问题
        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)
            logger.info(f"PDF 总页数: {total_pages}")
            
            text = ""
            successful_pages = 0
            empty_pages = 0
            
            # 4. 遍历每一页，提取文字
            # 注意：对于大文件（如1小时播客逐字稿），这可能需要几秒钟
            for page_num, page in enumerate(pdf.pages, 1):
                logger.info(f"正在处理第 {page_num}/{total_pages} 页")
                
                try:
                    # 提取当前页的文本
                    page_text = page.extract_text()
                    
                    if page_text and page_text.strip():
                        # 有内容的页面
                        text += page_text + "\n"
                        successful_pages += 1
                    else:
                        # 空页面或无法提取的页面
                        empty_pages += 1
                        logger.warning(f"第 {page_num} 页无法提取文字或为空")
                        
                except Exception as e:
                    logger.error(f"处理第 {page_num} 页时出错: {e}")
                    empty_pages += 1
                    continue
            
            # 5. 清理文本
            text = text.strip()
            
            # 6. 统计信息
            word_count = len(text)
            logger.info(f"PDF 处理完成: 成功={successful_pages}页, 空白={empty_pages}页, 总字数={word_count}")
            
            # 7. 检查是否提取到内容
            if not text:
                logger.error("PDF 中没有提取到任何文字，可能是扫描版 PDF")
                raise Exception("PDF 中没有文字内容，请确保是文本版 PDF（非扫描版）")
            
            return text
            
    except Exception as e:
        logger.error(f"PDF 解析失败: {e}", exc_info=True)
        raise

def validate_pdf_file(file_path: str, max_size_mb: int = 50):
    """
    验证 PDF 文件（增强版）

    不仅检查扩展名，还检查文件内容是否为真实的 PDF

    参数:
        file_path (str): PDF 文件路径
        max_size_mb (int): 最大文件大小（MB）

    返回:
        tuple: (is_valid, error_message)
    """
    # 1. 检查文件是否存在
    if not os.path.exists(file_path):
        return False, "文件不存在"

    # 2. 检查文件扩展名
    if not file_path.lower().endswith('.pdf'):
        return False, "文件格式错误，仅支持 PDF 格式"

    # 3. 检查文件大小
    file_size = os.path.getsize(file_path)
    file_size_mb = file_size / (1024 * 1024)

    if file_size_mb > max_size_mb:
        return False, f"文件过大，最大支持 {max_size_mb}MB"

    # 4. 检查文件内容（验证 PDF 魔数/文件头）
    try:
        with open(file_path, 'rb') as f:
            # 读取文件头（前 8 字节）
            header = f.read(8)

            # 检查是否为空文件
            if len(header) == 0:
                return False, "文件为空"

            # PDF 文件应该以 %PDF- 开头（魔数）
            if not header.startswith(b'%PDF-'):
                return False, "不是有效的 PDF 文件（文件头不正确）"

            logger.info(f"PDF 文件验证通过: {file_path}")
            return True, None

    except Exception as e:
        logger.error(f"PDF 文件验证失败: {e}")
        return False, f"文件验证失败: {str(e)}"


def validate_pdf_content(file_content: bytes, max_size_mb: int = 50) -> tuple:
    """
    验证 PDF 文件内容（用于上传时验证）

    这个函数接收文件的二进制内容，不需要保存到磁盘

    参数:
        file_content (bytes): PDF 文件的二进制内容
        max_size_mb (int): 最大文件大小（MB）

    返回:
        tuple: (is_valid, error_message)

    使用示例:
        file_content = await file.read()
        is_valid, error = validate_pdf_content(file_content)
    """
    # 1. 检查是否为空
    if not file_content:
        return False, "文件内容为空"

    # 2. 检查文件大小
    file_size_mb = len(file_content) / (1024 * 1024)
    if file_size_mb > max_size_mb:
        return False, f"文件过大，最大支持 {max_size_mb}MB"

    # 3. 检查 PDF 文件头（魔数）
    # PDF 文件必须以 %PDF- 开头
    if not file_content.startswith(b'%PDF-'):
        logger.warning(f"文件头不正确: {file_content[:20]}")
        return False, "不是有效的 PDF 文件（文件头不正确）"

    # 4. 检查 PDF 版本（可选）
    try:
        # PDF 文件头格式: %PDF-1.4 或 %PDF-1.7 等
        header = file_content[:8].decode('ascii')
        version = header[5:8]  # 例如: 1.4, 1.7
        logger.info(f"PDF 版本: {version}")
    except:
        logger.warning("无法识别 PDF 版本")

    # 5. 检查 EOF 标记（可选，某些 PDF 可能没有标准 EOF）
    # PDF 文件通常以 %%EOF 结尾
    if not file_content.rstrip().endswith(b'%%EOF'):
        logger.warning("PDF 文件可能不完整（缺少 EOF 标记）")
        # 不作为错误，仅警告

    logger.info(f"PDF 内容验证通过，大小: {file_size_mb:.2f}MB")
    return True, None

