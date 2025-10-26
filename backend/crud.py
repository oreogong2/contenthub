"""
文件名: crud.py
作用: 数据库 CRUD 操作
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

from sqlalchemy.orm import Session
from models import Material, Topic, Config, Tag, UsageStats
import logging
from datetime import datetime

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

def get_all_materials(db: Session, include_deleted: bool = False):
    """获取所有素材"""
    logger.info(f"获取所有素材: include_deleted={include_deleted}")
    query = db.query(Material)
    if not include_deleted:
        query = query.filter(Material.is_deleted == 0)
    return query.order_by(Material.created_at.desc()).all()

def delete_material(db: Session, material_id: int):
    """软删除素材"""
    logger.info(f"软删除素材: id={material_id}")
    material = db.query(Material).filter(Material.id == material_id).first()
    if material:
        material.is_deleted = 1
        material.deleted_at = datetime.now()
        db.commit()
        logger.info(f"素材软删除成功: {material.title}")
    return material

def restore_material(db: Session, material_id: int):
    """恢复素材"""
    logger.info(f"恢复素材: id={material_id}")
    material = db.query(Material).filter(Material.id == material_id).first()
    if material:
        material.is_deleted = 0
        material.deleted_at = None
        db.commit()
        logger.info(f"素材恢复成功: {material.title}")
    return material

def permanent_delete_material(db: Session, material_id: int):
    """永久删除素材"""
    logger.info(f"永久删除素材: id={material_id}")
    material = db.query(Material).filter(Material.id == material_id).first()
    if material:
        db.delete(material)
        db.commit()
        logger.info(f"素材永久删除成功: {material.title}")
    return material

def get_deleted_materials(db: Session):
    """获取已删除的素材"""
    logger.info("获取已删除的素材")
    return db.query(Material).filter(Material.is_deleted == 1).order_by(Material.deleted_at.desc()).all()

# ========== 标签相关操作 ==========

def get_all_tags(db: Session):
    """获取所有标签"""
    logger.info("获取所有标签")
    return db.query(Tag).order_by(Tag.usage_count.desc(), Tag.name.asc()).all()

def get_tag_by_name(db: Session, name: str):
    """根据名称获取标签"""
    logger.info(f"查询标签: name={name}")
    return db.query(Tag).filter(Tag.name == name).first()

def create_tag(db: Session, name: str, color: str = "#3b82f6", is_preset: bool = False):
    """创建标签"""
    logger.info(f"创建标签: name={name}, color={color}")
    tag = Tag(name=name, color=color, is_preset=1 if is_preset else 0)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    logger.info(f"标签创建成功: id={tag.id}")
    return tag

def update_tag_usage_count(db: Session, tag_name: str, increment: int = 1):
    """更新标签使用次数"""
    logger.info(f"更新标签使用次数: name={tag_name}, increment={increment}")
    tag = db.query(Tag).filter(Tag.name == tag_name).first()
    if tag:
        tag.usage_count += increment
        db.commit()
        logger.info(f"标签使用次数更新成功: {tag_name} -> {tag.usage_count}")
    return tag

def delete_tag(db: Session, tag_id: int):
    """删除标签"""
    logger.info(f"删除标签: id={tag_id}")
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag:
        db.delete(tag)
        db.commit()
        logger.info(f"标签删除成功: {tag.name}")
    return tag

# ========== 配置相关操作 ==========
def get_config(db: Session, key: str):
    """根据键获取配置"""
    logger.info(f"查询配置: key={key}")
    return db.query(Config).filter(Config.key == key).first()

def create_or_update_config(db: Session, key: str, value: str):
    """创建或更新配置"""
    logger.info(f"创建或更新配置: key={key}")
    config = db.query(Config).filter(Config.key == key).first()
    if config:
        config.value = value
        config.updated_at = datetime.now()
    else:
        config = Config(key=key, value=value)
        db.add(config)
    db.commit()
    logger.info(f"配置保存成功: {key}")
    return config

# ========== 使用统计相关操作 ==========
def create_or_update_usage_stats(db: Session, date: str, model: str, requests: int = 1, tokens: int = 0, cost: float = 0.0):
    """创建或更新使用统计"""
    logger.info(f"更新使用统计: date={date}, model={model}, requests={requests}, tokens={tokens}, cost={cost}")
    
    # 查找现有记录
    stats = db.query(UsageStats).filter(
        UsageStats.date == date,
        UsageStats.model == model
    ).first()
    
    if stats:
        # 更新现有记录
        stats.requests += requests
        stats.tokens += tokens
        stats.cost = str(float(stats.cost) + cost)
        stats.updated_at = datetime.now()
    else:
        # 创建新记录
        stats = UsageStats(
            date=date,
            model=model,
            requests=requests,
            tokens=tokens,
            cost=str(cost)
        )
        db.add(stats)
    
    db.commit()
    logger.info(f"使用统计更新成功: {date} - {model}")
    return stats

def get_usage_stats_summary(db: Session, days: int = 30):
    """获取使用统计汇总"""
    logger.info(f"获取使用统计汇总: 最近{days}天")
    
    from datetime import datetime, timedelta
    
    # 计算日期范围
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days-1)
    
    # 查询统计数据
    stats = db.query(UsageStats).filter(
        UsageStats.date >= start_date.strftime('%Y-%m-%d'),
        UsageStats.date <= end_date.strftime('%Y-%m-%d')
    ).all()
    
    # 汇总数据
    summary = {
        'total_requests': 0,
        'total_tokens': 0,
        'total_cost': 0.0,
        'by_model': {},
        'daily_usage': {}
    }
    
    for stat in stats:
        summary['total_requests'] += stat.requests
        summary['total_tokens'] += stat.tokens
        summary['total_cost'] += float(stat.cost)
        
        # 按模型统计
        if stat.model not in summary['by_model']:
            summary['by_model'][stat.model] = {
                'requests': 0,
                'tokens': 0,
                'cost': 0.0
            }
        summary['by_model'][stat.model]['requests'] += stat.requests
        summary['by_model'][stat.model]['tokens'] += stat.tokens
        summary['by_model'][stat.model]['cost'] += float(stat.cost)
        
        # 按日期统计
        if stat.date not in summary['daily_usage']:
            summary['daily_usage'][stat.date] = {
                'requests': 0,
                'tokens': 0,
                'cost': 0.0
            }
        summary['daily_usage'][stat.date]['requests'] += stat.requests
        summary['daily_usage'][stat.date]['tokens'] += stat.tokens
        summary['daily_usage'][stat.date]['cost'] += float(stat.cost)
    
    logger.info(f"使用统计汇总完成: 总请求{summary['total_requests']}次, 总费用${summary['total_cost']:.4f}")
    return summary


