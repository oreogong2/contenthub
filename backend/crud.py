"""
文件名: crud.py
作用: 数据库 CRUD 操作
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

from sqlalchemy.orm import Session
from models import Material, Topic, Config
import logging

logger = logging.getLogger(__name__)

# ========== 素材 CRUD ==========

def create_material(db: Session, material_data: dict):
    """创建素材"""
    logger.info(f"创建素材: source={material_data.get('source_type')}")
    db_material = Material(**material_data)
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    logger.info(f"素材创建成功: id={db_material.id}")
    return db_material

def get_material(db: Session, material_id: int):
    """获取素材"""
    logger.info(f"查询素材: id={material_id}")
    return db.query(Material).filter(Material.id == material_id).first()

# ========== 选题 CRUD ==========

def create_topic(db: Session, topic_data: dict):
    """创建选题"""
    logger.info(f"创建选题: title={topic_data.get('title')}")
    db_topic = Topic(**topic_data)
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    logger.info(f"选题创建成功: id={db_topic.id}")
    return db_topic

def get_topics(db: Session, skip: int = 0, limit: int = 20):
    """获取选题列表"""
    logger.info(f"查询选题列表: skip={skip}, limit={limit}")
    return db.query(Topic).offset(skip).limit(limit).all()

# ========== 配置 CRUD ==========

def get_config(db: Session, key: str):
    """获取配置"""
    logger.info(f"查询配置: key={key}")
    return db.query(Config).filter(Config.key == key).first()

def set_config(db: Session, key: str, value: str):
    """设置配置"""
    logger.info(f"设置配置: key={key}")
    config = db.query(Config).filter(Config.key == key).first()
    if config:
        config.value = value
    else:
        config = Config(key=key, value=value)
        db.add(config)
    db.commit()
    logger.info(f"配置保存成功: key={key}")
    return config

