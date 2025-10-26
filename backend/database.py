"""
文件名: database.py
作用: 数据库连接和会话管理
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

logger = logging.getLogger(__name__)

# 数据库连接字符串
DATABASE_URL = "sqlite:///./contenthub.db"

# 创建数据库引擎
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite 需要此配置
    echo=False  # 设置为 True 可以看到 SQL 语句
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """初始化数据库（创建所有表）"""
    from models import Base
    logger.info("开始初始化数据库")
    Base.metadata.create_all(bind=engine)
    logger.info("数据库初始化完成")


