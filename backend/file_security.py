"""
文件上传安全验证模块

提供文件类型验证、文件名净化、PDF结构验证等安全功能
"""

import os
import re
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# PDF 文件魔术字节（文件头）
PDF_MAGIC_BYTES = b'%PDF-'

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {'.pdf'}

# 文件名危险字符
DANGEROUS_CHARS = ['..', '/', '\\', '\x00', '\n', '\r', '\t']

# 最大文件名长度
MAX_FILENAME_LENGTH = 255


class FileValidationError(Exception):
    """文件验证异常"""
    pass


def validate_filename(filename: str) -> str:
    """
    验证并净化文件名

    防止路径遍历攻击和其他文件名相关的安全问题

    Args:
        filename: 原始文件名

    Returns:
        净化后的安全文件名

    Raises:
        FileValidationError: 文件名验证失败
    """
    if not filename:
        raise FileValidationError("文件名不能为空")

    # 检查文件名长度
    if len(filename) > MAX_FILENAME_LENGTH:
        raise FileValidationError(f"文件名过长，最大支持 {MAX_FILENAME_LENGTH} 字符")

    # 检查危险字符
    for dangerous_char in DANGEROUS_CHARS:
        if dangerous_char in filename:
            raise FileValidationError(f"文件名包含非法字符: {repr(dangerous_char)}")

    # 只保留文件名部分（移除任何路径）
    filename = os.path.basename(filename)

    # 移除控制字符和不可见字符
    filename = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', filename)

    # 确保文件名不为空或只包含空格/点
    cleaned = filename.strip('. ')
    if not cleaned:
        raise FileValidationError("文件名无效")

    logger.info(f"文件名验证通过: {cleaned}")
    return cleaned


def validate_file_extension(filename: str, allowed_extensions: set = ALLOWED_EXTENSIONS) -> str:
    """
    验证文件扩展名

    Args:
        filename: 文件名
        allowed_extensions: 允许的扩展名集合

    Returns:
        文件扩展名（小写）

    Raises:
        FileValidationError: 扩展名不允许
    """
    ext = os.path.splitext(filename)[1].lower()

    if ext not in allowed_extensions:
        allowed = ', '.join(allowed_extensions)
        raise FileValidationError(f"不支持的文件类型: {ext}，仅支持: {allowed}")

    logger.info(f"文件扩展名验证通过: {ext}")
    return ext


def validate_pdf_structure(file_content: bytes) -> Tuple[bool, Optional[str]]:
    """
    验证 PDF 文件结构

    检查文件头魔术字节，确保是真实的 PDF 文件

    Args:
        file_content: 文件内容字节

    Returns:
        (is_valid, error_message)

    Raises:
        FileValidationError: PDF 结构验证失败
    """
    if not file_content:
        raise FileValidationError("文件内容为空")

    # 检查文件最小大小（至少包含 PDF 头）
    if len(file_content) < 5:
        raise FileValidationError("文件太小，不是有效的 PDF 文件")

    # 验证 PDF 魔术字节
    if not file_content.startswith(PDF_MAGIC_BYTES):
        raise FileValidationError("文件头不匹配，不是有效的 PDF 文件")

    # 检查 PDF 结尾（可选，某些 PDF 可能不标准）
    # PDF 文件通常以 %%EOF 结尾
    if not file_content.rstrip().endswith(b'%%EOF'):
        logger.warning("PDF 文件没有标准的 %%EOF 结尾，可能是损坏或特殊格式的 PDF")

    logger.info("PDF 文件结构验证通过")
    return True, None


def validate_file_size(file_content: bytes, max_size_mb: int = 50) -> float:
    """
    验证文件大小

    Args:
        file_content: 文件内容字节
        max_size_mb: 最大允许大小（MB）

    Returns:
        文件大小（MB）

    Raises:
        FileValidationError: 文件过大
    """
    file_size_bytes = len(file_content)
    file_size_mb = file_size_bytes / (1024 * 1024)

    if file_size_mb > max_size_mb:
        raise FileValidationError(f"文件过大: {file_size_mb:.2f}MB，最大支持: {max_size_mb}MB")

    logger.info(f"文件大小验证通过: {file_size_mb:.2f}MB")
    return file_size_mb


def validate_upload_file(
    filename: str,
    file_content: bytes,
    max_size_mb: int = 50,
    allowed_extensions: set = ALLOWED_EXTENSIONS
) -> Tuple[str, float]:
    """
    完整的文件上传验证流程

    Args:
        filename: 文件名
        file_content: 文件内容
        max_size_mb: 最大文件大小（MB）
        allowed_extensions: 允许的扩展名

    Returns:
        (sanitized_filename, file_size_mb)

    Raises:
        FileValidationError: 验证失败
    """
    logger.info(f"开始文件验证: {filename}")

    # 1. 验证文件名
    safe_filename = validate_filename(filename)

    # 2. 验证扩展名
    ext = validate_file_extension(safe_filename, allowed_extensions)

    # 3. 验证文件大小
    file_size_mb = validate_file_size(file_content, max_size_mb)

    # 4. 如果是 PDF，验证文件结构
    if ext == '.pdf':
        validate_pdf_structure(file_content)

    logger.info(f"文件验证全部通过: {safe_filename} ({file_size_mb:.2f}MB)")

    return safe_filename, file_size_mb
