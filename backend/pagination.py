"""
文件名: pagination.py
作用: 通用分页辅助类
作者: ContentHub Team
日期: 2025-10-26
最后更新: 2025-10-26
"""

from typing import TypeVar, Generic, List, Dict, Optional, Any
from sqlalchemy.orm import Session, Query
from sqlalchemy import or_, and_
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')

class Paginator(Generic[T]):
    """
    通用分页器

    提供简洁的分页 API，减少重复代码

    使用示例:
        from models import Material
        from pagination import Paginator

        paginator = Paginator(Material)

        result = paginator.paginate(
            db=db,
            page=1,
            per_page=20,
            filters={'source_type': 'twitter'},
            search_fields=['title', 'content'],
            search_keyword='AI',
            order_by_field='created_at',
            order_desc=True
        )

        # 返回:
        # {
        #     'items': [...],
        #     'total': 100,
        #     'page': 1,
        #     'per_page': 20,
        #     'total_pages': 5,
        #     'has_next': True,
        #     'has_prev': False
        # }
    """

    def __init__(self, model):
        """
        初始化分页器

        参数:
            model: SQLAlchemy 模型类
        """
        self.model = model

    def paginate(
        self,
        db: Session,
        page: int = 1,
        per_page: int = 20,
        filters: Optional[Dict[str, Any]] = None,
        search_fields: Optional[List[str]] = None,
        search_keyword: Optional[str] = None,
        order_by_field: str = 'id',
        order_desc: bool = True
    ) -> Dict:
        """
        执行分页查询

        参数:
            db: 数据库会话
            page: 页码（从 1 开始）
            per_page: 每页数量
            filters: 过滤条件字典 {'field_name': value}
            search_fields: 搜索字段列表 ['title', 'content']
            search_keyword: 搜索关键词
            order_by_field: 排序字段名
            order_desc: 是否降序（True=降序，False=升序）

        返回:
            Dict: 包含 items, total, page 等信息的字典
        """
        # 1. 创建基础查询
        query = db.query(self.model)

        # 2. 应用过滤条件
        if filters:
            query = self._apply_filters(query, filters)

        # 3. 应用搜索
        if search_keyword and search_fields:
            query = self._apply_search(query, search_fields, search_keyword)

        # 4. 应用排序
        query = self._apply_ordering(query, order_by_field, order_desc)

        # 5. 统计总数
        total = query.count()
        logger.info(f"查询 {self.model.__name__} 总数: {total}")

        # 6. 计算分页参数
        total_pages = (total + per_page - 1) // per_page if total > 0 else 0

        # 验证页码
        if page < 1:
            page = 1
        if page > total_pages and total_pages > 0:
            page = total_pages

        # 7. 执行分页查询
        offset = (page - 1) * per_page
        items = query.offset(offset).limit(per_page).all()

        logger.info(
            f"分页查询完成: page={page}, per_page={per_page}, "
            f"返回 {len(items)} 条记录"
        )

        # 8. 返回结果
        return {
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1
        }

    def _apply_filters(self, query: Query, filters: Dict[str, Any]) -> Query:
        """
        应用过滤条件

        参数:
            query: SQLAlchemy 查询对象
            filters: 过滤条件字典

        返回:
            Query: 应用过滤后的查询对象
        """
        for key, value in filters.items():
            if value is None:
                continue

            # 检查模型是否有该字段
            if not hasattr(self.model, key):
                logger.warning(f"模型 {self.model.__name__} 没有字段 {key}")
                continue

            column = getattr(self.model, key)

            # 如果值是列表，使用 IN 查询
            if isinstance(value, list):
                query = query.filter(column.in_(value))
            # 如果值包含通配符，使用 LIKE 查询
            elif isinstance(value, str) and ('%' in value or '_' in value):
                query = query.filter(column.like(value))
            # 否则使用精确匹配
            else:
                query = query.filter(column == value)

        return query

    def _apply_search(
        self,
        query: Query,
        search_fields: List[str],
        search_keyword: str
    ) -> Query:
        """
        应用搜索条件

        在多个字段中搜索关键词（OR 关系）

        参数:
            query: SQLAlchemy 查询对象
            search_fields: 搜索字段列表
            search_keyword: 搜索关键词

        返回:
            Query: 应用搜索后的查询对象
        """
        if not search_keyword or not search_fields:
            return query

        # 构建搜索条件（多个字段用 OR 连接）
        search_conditions = []

        for field in search_fields:
            if not hasattr(self.model, field):
                logger.warning(f"模型 {self.model.__name__} 没有字段 {field}")
                continue

            column = getattr(self.model, field)
            # LIKE 搜索（不区分大小写，取决于数据库配置）
            search_conditions.append(column.like(f"%{search_keyword}%"))

        if search_conditions:
            query = query.filter(or_(*search_conditions))

        return query

    def _apply_ordering(
        self,
        query: Query,
        order_by_field: str,
        order_desc: bool
    ) -> Query:
        """
        应用排序

        参数:
            query: SQLAlchemy 查询对象
            order_by_field: 排序字段名
            order_desc: 是否降序

        返回:
            Query: 应用排序后的查询对象
        """
        if not hasattr(self.model, order_by_field):
            logger.warning(
                f"模型 {self.model.__name__} 没有字段 {order_by_field}，"
                f"使用默认排序 id"
            )
            order_by_field = 'id'

        column = getattr(self.model, order_by_field)

        if order_desc:
            query = query.order_by(column.desc())
        else:
            query = query.order_by(column.asc())

        return query


def create_paginator(model) -> Paginator:
    """
    创建分页器的工厂函数

    参数:
        model: SQLAlchemy 模型类

    返回:
        Paginator: 分页器实例

    使用示例:
        material_paginator = create_paginator(Material)
    """
    return Paginator(model)
