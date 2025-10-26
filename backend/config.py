"""
文件名: config.py
作用: 配置管理
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

import os
from typing import Optional

class Settings:
    """应用配置类"""
    
    # 数据库配置
    DATABASE_URL: str = "sqlite:///./contenthub.db"
    
    # 文件上传配置
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: set = {'.pdf'}
    
    # AI 配置
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    CLAUDE_API_KEY: Optional[str] = os.getenv("CLAUDE_API_KEY")
    DEFAULT_AI_MODEL: str = "gpt-4"
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "app.log"

settings = Settings()


