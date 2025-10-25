"""
文件名: crud.py
作用: 数据库 CRUD 操作
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-26
"""

from sqlalchemy.orm import Session
from models import Material, Topic, Config
from secure_config import get_secure_config_manager, is_sensitive_config
import logging

logger = logging.getLogger(__name__)

# 获取安全配置管理器
secure_manager = get_secure_config_manager()

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
    """
    获取配置

    对于敏感配置（API Key），会自动解密

    参数:
        db: 数据库会话
        key: 配置键

    返回:
        Config: 配置对象，如果不存在返回 None
    """
    logger.info(f"查询配置: key={key}")
    config = db.query(Config).filter(Config.key == key).first()

    if not config:
        return None

    # 对于敏感配置，自动解密
    if is_sensitive_config(key) and config.value:
        try:
            config.value = secure_manager.decrypt(config.value)
            logger.debug(f"配置 {key} 已解密")
        except Exception as e:
            logger.warning(f"配置 {key} 解密失败，可能是未加密的旧数据: {e}")
            # 解密失败时返回原始值（可能是未加密的旧数据）

    return config

def set_config(db: Session, key: str, value: str):
    """
    设置配置

    对于敏感配置（API Key），会自动加密后保存

    参数:
        db: 数据库会话
        key: 配置键
        value: 配置值

    返回:
        Config: 保存后的配置对象
    """
    logger.info(f"设置配置: key={key}")

    # 对于敏感配置，自动加密
    stored_value = value
    if is_sensitive_config(key) and value:
        try:
            stored_value = secure_manager.encrypt(value)
            logger.debug(f"配置 {key} 已加密")
        except Exception as e:
            logger.error(f"配置 {key} 加密失败: {e}")
            raise Exception(f"配置加密失败: {e}")

    config = db.query(Config).filter(Config.key == key).first()
    if config:
        config.value = stored_value
    else:
        config = Config(key=key, value=stored_value)
        db.add(config)
    db.commit()
    logger.info(f"配置保存成功: key={key}")
    return config

def get_config_value(db: Session, key: str, default=None):
    """
    直接获取配置值（字符串）

    这是一个便捷方法，直接返回配置的值而不是 Config 对象

    参数:
        db: 数据库会话
        key: 配置键
        default: 默认值（当配置不存在时返回）

    返回:
        str: 配置值，如果不存在返回 default
    """
    config = get_config(db, key)
    return config.value if config else default

