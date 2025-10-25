"""
文件名: models.py
作用: 定义 SQLAlchemy 数据库模型
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-26
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Material(Base):
    """素材表（已优化索引）"""
    __tablename__ = 'materials'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=True, index=True, comment='素材标题')
    content = Column(Text, nullable=False, comment='素材内容')
    source_type = Column(String(20), nullable=False, index=True, comment='来源类型')
    file_name = Column(String(200), nullable=True, comment='PDF文件名')
    created_at = Column(DateTime, default=datetime.now, index=True, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')

    # 复合索引：用于常见的查询组合
    # 例如：按来源类型和创建时间排序查询
    __table_args__ = (
        Index('idx_source_created', 'source_type', 'created_at'),
    )

class Topic(Base):
    """选题表（已优化索引）"""
    __tablename__ = 'topics'

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, nullable=False, index=True, comment='关联的素材ID')
    title = Column(String(200), nullable=False, index=True, comment='选题标题')
    refined_content = Column(Text, nullable=False, comment='提炼后的内容')
    prompt_name = Column(String(100), nullable=True, comment='使用的提示词名称')
    tags = Column(Text, nullable=False, comment='标签（JSON格式）')
    source_type = Column(String(20), nullable=True, index=True, comment='来源类型')
    created_at = Column(DateTime, default=datetime.now, index=True, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')

    # 复合索引：用于常见的查询组合
    __table_args__ = (
        Index('idx_material_created', 'material_id', 'created_at'),
        Index('idx_topic_source_created', 'source_type', 'created_at'),
    )

class Config(Base):
    """配置表"""
    __tablename__ = 'configs'
    
    key = Column(String(100), primary_key=True, comment='配置键')
    value = Column(Text, nullable=True, comment='配置值')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')

