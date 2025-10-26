"""
文件名: models.py
作用: 定义 SQLAlchemy 数据库模型
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Material(Base):
    """素材表"""
    __tablename__ = 'materials'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=True, comment='素材标题')
    content = Column(Text, nullable=False, comment='素材内容')
    content_full = Column(Text, nullable=True, comment='完整内容')
    content_length = Column(Integer, nullable=True, comment='内容长度')
    source_type = Column(String(20), nullable=False, comment='来源类型')
    file_name = Column(String(200), nullable=True, comment='PDF文件名')
    tags = Column(Text, nullable=True, comment='标签（JSON格式）')
    is_deleted = Column(Integer, default=0, comment='是否已删除（0=未删除，1=已删除）')
    deleted_at = Column(DateTime, nullable=True, comment='删除时间')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')

class Topic(Base):
    """选题表"""
    __tablename__ = 'topics'
    
    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, nullable=False, comment='关联的素材ID')
    title = Column(String(200), nullable=False, comment='选题标题')
    refined_content = Column(Text, nullable=False, comment='提炼后的内容')
    prompt_name = Column(String(100), nullable=True, comment='使用的提示词名称')
    tags = Column(Text, nullable=False, comment='标签（JSON格式）')
    source_type = Column(String(20), nullable=True, comment='来源类型')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')

class Tag(Base):
    """标签表"""
    __tablename__ = 'tags'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), nullable=False, unique=True, comment='标签名称')
    color = Column(String(7), nullable=False, default='#3b82f6', comment='标签颜色')
    usage_count = Column(Integer, default=0, comment='使用次数')
    is_preset = Column(Integer, default=0, comment='是否预设标签')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')

class UsageStats(Base):
    """使用统计表"""
    __tablename__ = 'usage_stats'
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, comment='日期 YYYY-MM-DD')
    model = Column(String(50), nullable=False, comment='AI模型名称')
    requests = Column(Integer, default=0, comment='请求次数')
    tokens = Column(Integer, default=0, comment='Token数量')
    cost = Column(String(20), default='0', comment='费用')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')

class Config(Base):
    """配置表"""
    __tablename__ = 'configs'
    
    key = Column(String(100), primary_key=True, comment='配置键')
    value = Column(Text, nullable=True, comment='配置值')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')


