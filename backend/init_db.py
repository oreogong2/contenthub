"""
文件名: init_db.py
作用: 初始化数据库，创建所有表
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

import logging
from database import engine, init_db
from models import Base, Material, Topic, Config
import json

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def create_tables():
    """创建所有数据库表"""
    logger.info("=" * 60)
    logger.info("开始初始化数据库")
    logger.info("=" * 60)
    
    try:
        # 创建所有表
        Base.metadata.create_all(bind=engine)
        logger.info("✅ 数据库表创建成功")
        
        # 显示创建的表
        logger.info("\n已创建的表：")
        for table_name in Base.metadata.tables.keys():
            logger.info(f"  - {table_name}")
        
        return True
    except Exception as e:
        logger.error(f"❌ 数据库初始化失败: {e}", exc_info=True)
        return False

def init_default_data():
    """初始化默认数据（预设提示词和标签）"""
    from database import SessionLocal
    
    logger.info("\n开始初始化默认数据...")
    
    db = SessionLocal()
    try:
        # 检查是否已有数据
        existing_config = db.query(Config).first()
        if existing_config:
            logger.info("⚠️  数据库已有数据，跳过默认数据初始化")
            return
        
        # 1. 初始化预设标签
        preset_tags = [
            "商业思维",
            "科技趋势",
            "生活方式",
            "创业故事",
            "个人成长",
            "情感励志"
        ]
        
        tags_config = Config(
            key="preset_tags",
            value=json.dumps(preset_tags, ensure_ascii=False)
        )
        db.add(tags_config)
        logger.info(f"✅ 初始化预设标签: {len(preset_tags)} 个")
        
        # 2. 初始化默认提示词
        default_prompts = [
            {
                "id": 1,
                "name": "提取核心观点",
                "content": "请从以下内容中提取 3-5 个核心观点，每个观点用一句话概括，突出重点和价值。",
                "description": "适合快速了解重点",
                "is_default": True
            },
            {
                "id": 2,
                "name": "生成短视频脚本",
                "content": "将以下内容改写成 60 秒短视频口播稿，要求：\n1. 开头有钩子吸引观众（3-5秒）\n2. 中间讲清楚核心内容（40-50秒）\n3. 结尾有行动号召（5-10秒）",
                "description": "包含钩子、正文、行动号召",
                "is_default": False
            },
            {
                "id": 3,
                "name": "可拍摄角度",
                "content": "分析以下内容，给出 3 个可以拍摄的短视频角度，每个角度包括：\n1. 选题方向\n2. 核心内容\n3. 预期效果",
                "description": "分析多个拍摄角度",
                "is_default": False
            },
            {
                "id": 4,
                "name": "提炼标题",
                "content": "根据以下内容，生成 5 个吸引人的短视频标题，要求：\n1. 15 字以内\n2. 有悬念或价值点\n3. 符合平台风格",
                "description": "生成吸引人的标题",
                "is_default": False
            }
        ]
        
        prompts_config = Config(
            key="default_prompts",
            value=json.dumps(default_prompts, ensure_ascii=False)
        )
        db.add(prompts_config)
        logger.info(f"✅ 初始化默认提示词: {len(default_prompts)} 个")
        
        # 3. 初始化默认配置
        default_model_config = Config(
            key="default_ai_model",
            value="gpt-4"
        )
        db.add(default_model_config)
        logger.info("✅ 初始化默认 AI 模型配置: gpt-4")
        
        # 提交所有改动
        db.commit()
        logger.info("\n✅ 默认数据初始化完成")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ 默认数据初始化失败: {e}", exc_info=True)
    finally:
        db.close()

def verify_database():
    """验证数据库是否正确创建"""
    from database import SessionLocal
    import os
    
    logger.info("\n开始验证数据库...")
    
    # 1. 检查数据库文件是否存在
    db_file = "contenthub.db"
    if os.path.exists(db_file):
        file_size = os.path.getsize(db_file)
        logger.info(f"✅ 数据库文件存在: {db_file} ({file_size} bytes)")
    else:
        logger.error(f"❌ 数据库文件不存在: {db_file}")
        return False
    
    # 2. 测试数据库连接
    db = SessionLocal()
    try:
        # 测试查询每张表
        material_count = db.query(Material).count()
        topic_count = db.query(Topic).count()
        config_count = db.query(Config).count()
        
        logger.info(f"✅ materials 表: {material_count} 条记录")
        logger.info(f"✅ topics 表: {topic_count} 条记录")
        logger.info(f"✅ configs 表: {config_count} 条记录")
        
        logger.info("\n✅ 数据库验证通过")
        return True
        
    except Exception as e:
        logger.error(f"❌ 数据库验证失败: {e}", exc_info=True)
        return False
    finally:
        db.close()

def test_crud_operations():
    """测试基本的 CRUD 操作"""
    from database import SessionLocal
    from datetime import datetime
    
    logger.info("\n开始测试 CRUD 操作...")
    
    db = SessionLocal()
    try:
        # 1. 测试 CREATE - 创建一条测试素材
        logger.info("\n1️⃣ 测试 CREATE 操作...")
        test_material = Material(
            title="测试素材",
            content="这是一条测试素材内容，用于验证数据库 CRUD 操作是否正常。",
            source_type="twitter"
        )
        db.add(test_material)
        db.commit()
        db.refresh(test_material)
        logger.info(f"✅ CREATE 成功: 创建素材 ID={test_material.id}")
        
        # 2. 测试 READ - 读取刚创建的素材
        logger.info("\n2️⃣ 测试 READ 操作...")
        read_material = db.query(Material).filter(Material.id == test_material.id).first()
        if read_material:
            logger.info(f"✅ READ 成功: 素材标题='{read_material.title}'")
        else:
            logger.error("❌ READ 失败: 未找到素材")
            return False
        
        # 3. 测试 UPDATE - 更新素材
        logger.info("\n3️⃣ 测试 UPDATE 操作...")
        read_material.title = "测试素材（已更新）"
        db.commit()
        db.refresh(read_material)
        logger.info(f"✅ UPDATE 成功: 新标题='{read_material.title}'")
        
        # 4. 创建一条测试选题
        logger.info("\n4️⃣ 测试创建选题...")
        test_topic = Topic(
            material_id=test_material.id,
            title="测试选题",
            refined_content="这是提炼后的内容",
            prompt_name="提取核心观点",
            tags=json.dumps(["测试标签"], ensure_ascii=False),
            source_type="twitter"
        )
        db.add(test_topic)
        db.commit()
        db.refresh(test_topic)
        logger.info(f"✅ 创建选题成功: ID={test_topic.id}")
        
        # 5. 测试 DELETE - 删除测试数据
        logger.info("\n5️⃣ 测试 DELETE 操作...")
        db.delete(test_topic)
        db.delete(test_material)
        db.commit()
        logger.info("✅ DELETE 成功: 测试数据已清理")
        
        # 6. 验证删除
        verify_deleted = db.query(Material).filter(Material.id == test_material.id).first()
        if verify_deleted is None:
            logger.info("✅ 验证成功: 数据已彻底删除")
        else:
            logger.error("❌ 验证失败: 数据未删除")
            return False
        
        logger.info("\n✅ 所有 CRUD 操作测试通过")
        return True
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ CRUD 测试失败: {e}", exc_info=True)
        return False
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("ContentHub 数据库初始化脚本")
    logger.info("=" * 60)
    
    # 1. 创建数据库表
    if not create_tables():
        logger.error("数据库表创建失败，终止初始化")
        exit(1)
    
    # 2. 初始化默认数据
    init_default_data()
    
    # 3. 验证数据库
    if not verify_database():
        logger.error("数据库验证失败")
        exit(1)
    
    # 4. 测试 CRUD 操作
    if not test_crud_operations():
        logger.error("CRUD 操作测试失败")
        exit(1)
    
    logger.info("\n" + "=" * 60)
    logger.info("🎉 数据库初始化完成！所有测试通过！")
    logger.info("=" * 60)

