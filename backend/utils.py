"""
文件名: utils.py
作用: 通用工具函数
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def format_date(dt: datetime) -> str:
    """格式化日期"""
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def validate_file_size(file_size: int, max_size: int) -> bool:
    """验证文件大小"""
    return file_size <= max_size

def sanitize_filename(filename: str) -> str:
    """清理文件名"""
    # 移除不安全的字符
    import re
    return re.sub(r'[^\w\s.-]', '', filename)

