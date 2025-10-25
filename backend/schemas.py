"""
文件名: schemas.py
作用: Pydantic 数据模型（用于请求和响应验证）
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ========== 素材相关模型 ==========

class MaterialCreate(BaseModel):
    """创建素材的请求模型"""
    title: Optional[str] = Field(None, max_length=200, description="素材标题")
    content: str = Field(..., min_length=1, description="素材内容")
    source_type: str = Field(..., description="来源类型")

class MaterialResponse(BaseModel):
    """素材响应模型"""
    id: int
    title: Optional[str]
    content: str
    source_type: str
    file_name: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# ========== 选题相关模型 ==========

class TopicCreate(BaseModel):
    """创建选题的请求模型"""
    material_id: int = Field(..., description="关联的素材ID")
    title: str = Field(..., min_length=1, max_length=200, description="选题标题")
    refined_content: str = Field(..., min_length=1, description="提炼后的内容")
    prompt_name: Optional[str] = Field(None, description="使用的提示词名称")
    tags: List[str] = Field(..., min_items=1, description="标签列表")
    source_type: Optional[str] = Field(None, description="来源类型")

class TopicResponse(BaseModel):
    """选题响应模型"""
    id: int
    material_id: int
    title: str
    refined_content: str
    prompt_name: Optional[str]
    tags: str  # JSON 字符串
    source_type: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# ========== AI 提炼相关模型 ==========

class RefineRequest(BaseModel):
    """AI 提炼请求模型"""
    material_id: int = Field(..., description="素材ID")
    prompt_id: int = Field(..., description="提示词ID")
    model: Optional[str] = Field("gpt-3.5-turbo", description="AI模型")
    api_key: Optional[str] = Field(None, description="API密钥")

class BatchRefineRequest(BaseModel):
    """批量提炼请求模型"""
    material_ids: List[int] = Field(..., min_items=2, max_items=5, description="素材ID列表（2-5个）")
    prompt_id: Optional[int] = Field(None, description="提示词ID")
    custom_prompt: Optional[str] = Field(None, description="自定义提示词")
    mode: str = Field("synthesize", description="提炼模式：combine/compare/synthesize")
    model: Optional[str] = Field("gpt-3.5-turbo", description="AI模型")
    api_key: Optional[str] = Field(None, description="API密钥")

class TopicInspirationRequest(BaseModel):
    """选题灵感请求模型"""
    material_ids: Optional[List[int]] = Field(None, description="素材ID列表（可选，不提供则分析所有素材）")
    source_type: Optional[str] = Field(None, description="来源类型过滤（可选）")
    count: int = Field(5, ge=1, le=10, description="生成灵感数量")
    model: Optional[str] = Field("gpt-3.5-turbo", description="AI模型")
    api_key: Optional[str] = Field(None, description="API密钥")

# ========== 通用响应模型 ==========

class ApiResponse(BaseModel):
    """统一 API 响应模型"""
    code: int = Field(200, description="状态码")
    message: str = Field("success", description="响应消息")
    data: Optional[dict] = Field(None, description="响应数据")

