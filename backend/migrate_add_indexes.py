"""
数据库索引迁移脚本

为 materials 和 topics 表添加索引以提升查询性能
"""

import sqlite3
import logging
import os
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_indexes():
    """添加数据库索引"""

    # 获取数据库路径
    db_path = Path(__file__).parent / 'contenthub.db'

    if not db_path.exists():
        logger.error(f"数据库文件不存在: {db_path}")
        return False

    logger.info(f"连接数据库: {db_path}")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Materials 表索引
        indexes_to_create = [
            # 单列索引（如果字段定义中未添加 index=True）
            ("CREATE INDEX IF NOT EXISTS idx_material_source_type ON materials(source_type)", "materials.source_type"),
            ("CREATE INDEX IF NOT EXISTS idx_material_is_deleted ON materials(is_deleted)", "materials.is_deleted"),
            ("CREATE INDEX IF NOT EXISTS idx_material_created_at ON materials(created_at)", "materials.created_at"),

            # 复合索引
            ("CREATE INDEX IF NOT EXISTS idx_material_source_deleted ON materials(source_type, is_deleted)", "materials(source_type, is_deleted)"),
            ("CREATE INDEX IF NOT EXISTS idx_material_created_deleted ON materials(created_at, is_deleted)", "materials(created_at, is_deleted)"),

            # Topics 表索引
            ("CREATE INDEX IF NOT EXISTS idx_topic_material_id ON topics(material_id)", "topics.material_id"),
            ("CREATE INDEX IF NOT EXISTS idx_topic_source_type ON topics(source_type)", "topics.source_type"),
            ("CREATE INDEX IF NOT EXISTS idx_topic_created_at ON topics(created_at)", "topics.created_at"),
        ]

        logger.info("开始创建索引...")

        for sql, description in indexes_to_create:
            try:
                logger.info(f"创建索引: {description}")
                cursor.execute(sql)
                logger.info(f"✅ 索引创建成功: {description}")
            except sqlite3.Error as e:
                logger.warning(f"⚠️  索引可能已存在: {description} - {e}")

        conn.commit()
        logger.info("✅ 所有索引创建完成！")

        # 验证索引
        logger.info("\n验证已创建的索引:")
        cursor.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND tbl_name IN ('materials', 'topics') ORDER BY tbl_name, name")
        indexes = cursor.fetchall()

        for index_name, table_name in indexes:
            logger.info(f"  - {table_name}.{index_name}")

        # 分析表以优化查询计划
        logger.info("\n分析表统计信息...")
        cursor.execute("ANALYZE materials")
        cursor.execute("ANALYZE topics")
        logger.info("✅ 表分析完成")

        conn.close()
        logger.info("\n🎉 数据库索引迁移成功！")
        return True

    except Exception as e:
        logger.error(f"❌ 迁移失败: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("数据库索引迁移脚本")
    logger.info("=" * 60)

    success = add_indexes()

    if success:
        logger.info("\n✅ 迁移成功！查询性能将得到显著提升。")
    else:
        logger.error("\n❌ 迁移失败！请检查错误日志。")
        exit(1)
