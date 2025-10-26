"""
数据库迁移脚本：添加 source_url 字段到 materials 表

运行方法：
python backend/migrate_add_source_url.py
"""

import sqlite3
import os

def migrate():
    # 数据库路径
    db_path = 'backend/contenthub.db'

    if not os.path.exists(db_path):
        print(f"❌ 数据库文件不存在: {db_path}")
        print("请先运行 python backend/init_db.py 初始化数据库")
        return

    try:
        # 连接数据库
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 检查字段是否已存在
        cursor.execute("PRAGMA table_info(materials)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'source_url' in columns:
            print("✅ source_url 字段已存在，无需迁移")
            return

        print("🔧 开始迁移：添加 source_url 字段...")

        # 添加 source_url 字段
        cursor.execute("""
            ALTER TABLE materials
            ADD COLUMN source_url VARCHAR(500)
        """)

        conn.commit()
        print("✅ 迁移成功！已添加 source_url 字段到 materials 表")

        # 验证
        cursor.execute("PRAGMA table_info(materials)")
        columns = cursor.fetchall()
        print("\n📋 当前 materials 表结构：")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")

    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    migrate()
