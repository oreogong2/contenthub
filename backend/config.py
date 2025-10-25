"""
文件名: config.py
作用: 配置管理（使用 Pydantic Settings）
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-26
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    应用配置类

    使用 Pydantic Settings 进行配置管理，支持：
    1. 从环境变量读取
    2. 从 .env 文件读取
    3. 类型验证
    4. 默认值

    使用示例:
        from config import settings

        # 读取配置
        print(settings.DATABASE_URL)
        print(settings.DEBUG)

        # 在 .env 文件中设置:
        # DEBUG=true
        # DATABASE_URL=sqlite:///./dev.db
        # OPENAI_API_KEY=sk-xxxxx
    """

    # ========== 应用设置 ==========
    APP_NAME: str = Field(default="ContentHub", description="应用名称")
    APP_VERSION: str = Field(default="1.0.0", description="应用版本")
    DEBUG: bool = Field(default=False, description="调试模式")

    # ========== 数据库配置 ==========
    DATABASE_URL: str = Field(
        default="sqlite:///./contenthub.db",
        description="数据库连接字符串"
    )

    # ========== 文件上传配置 ==========
    UPLOAD_DIR: str = Field(default="uploads", description="文件上传目录")
    MAX_FILE_SIZE: int = Field(
        default=50 * 1024 * 1024,
        description="最大文件大小（字节）"
    )
    ALLOWED_EXTENSIONS: str = Field(
        default=".pdf",
        description="允许的文件扩展名（逗号分隔）"
    )

    # ========== AI 配置 ==========
    OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        description="OpenAI API Key（可选，优先使用数据库配置）"
    )
    CLAUDE_API_KEY: Optional[str] = Field(
        default=None,
        description="Claude API Key（可选，优先使用数据库配置）"
    )
    DEEPSEEK_API_KEY: Optional[str] = Field(
        default=None,
        description="DeepSeek API Key（可选，优先使用数据库配置）"
    )
    DEFAULT_AI_MODEL: str = Field(default="gpt-4", description="默认 AI 模型")

    # ========== 日志配置 ==========
    LOG_LEVEL: str = Field(default="INFO", description="日志级别")
    LOG_FILE: str = Field(default="app.log", description="日志文件路径")

    # ========== 安全配置 ==========
    CONFIG_ENCRYPTION_KEY: Optional[str] = Field(
        default=None,
        description="配置加密密钥（用于加密 API Key）"
    )

    # ========== CORS 配置 ==========
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        description="允许的 CORS 源（逗号分隔）"
    )

    class Config:
        """Pydantic Settings 配置"""
        env_file = ".env"  # 从 .env 文件读取
        env_file_encoding = "utf-8"
        case_sensitive = True  # 区分大小写

    def get_allowed_extensions(self) -> set:
        """
        获取允许的文件扩展名集合

        返回:
            set: 扩展名集合，如 {'.pdf', '.txt'}
        """
        return set(ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(','))

    def get_cors_origins(self) -> list:
        """
        获取允许的 CORS 源列表

        返回:
            list: CORS 源列表
        """
        return [origin.strip() for origin in self.CORS_ORIGINS.split(',')]


# 创建全局配置实例
settings = Settings()

