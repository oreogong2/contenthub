"""
文件名: main.py
作用: FastAPI 主程序，定义所有 REST API 接口
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# 创建 FastAPI 应用
app = FastAPI(
    title="ContentHub API",
    description="短视频选题素材管理器 API",
    version="1.0.0"
)

# 配置 CORS（允许前端跨域访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """根路径"""
    logger.info("访问根路径")
    return {
        "message": "欢迎使用 ContentHub API",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    """健康检查接口"""
    logger.info("健康检查")
    return {"status": "healthy"}

# ========== 素材管理接口 ==========

from fastapi import Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from schemas import MaterialCreate, MaterialResponse, ApiResponse, RefineRequest, BatchRefineRequest, TopicInspirationRequest
import crud
import os
import uuid
from pdf_service import extract_text_from_pdf, validate_pdf_file
from config import settings
from ai_service import refine_content, get_default_prompts

@app.post("/api/materials/text", response_model=ApiResponse)
async def create_text_material(
    material: MaterialCreate,
    db: Session = Depends(get_db)
):
    """
    创建文本素材
    
    接收用户输入的文本内容，保存为素材
    """
    logger.info(f"创建文本素材: source={material.source_type}, content_length={len(material.content)}")
    
    try:
        # 1. 验证内容不为空
        if not material.content or not material.content.strip():
            logger.warning("内容为空")
            raise HTTPException(status_code=400, detail="内容不能为空")
        
        # 2. 验证内容长度
        if len(material.content) > 50000:
            logger.warning(f"内容过长: {len(material.content)} 字")
            raise HTTPException(status_code=400, detail="内容过长，最多50000字")
        
        # 3. 准备数据
        material_data = {
            "title": material.title,
            "content": material.content.strip(),
            "source_type": material.source_type
        }
        
        # 4. 保存到数据库
        db_material = crud.create_material(db, material_data)
        
        logger.info(f"素材创建成功: id={db_material.id}")
        
        # 5. 返回成功响应
        return ApiResponse(
            code=200,
            message="素材创建成功",
            data={
                "id": db_material.id,
                "title": db_material.title,
                "source_type": db_material.source_type,
                "content_length": len(db_material.content),
                "created_at": db_material.created_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建素材失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.get("/api/materials", response_model=ApiResponse)
async def get_materials_list(
    page: int = 1,
    per_page: int = 20,
    search: str = None,
    source_type: str = None,
    db: Session = Depends(get_db)
):
    """
    获取素材列表
    
    支持分页、搜索、来源筛选
    """
    logger.info(f"获取素材列表: page={page}, per_page={per_page}, search={search}, source_type={source_type}")
    
    try:
        from models import Material
        
        # 构建查询
        query = db.query(Material)
        
        # 来源筛选
        if source_type:
            logger.info(f"按来源筛选: {source_type}")
            query = query.filter(Material.source_type == source_type)
        
        # 搜索
        if search:
            logger.info(f"搜索关键词: {search}")
            search_pattern = f"%{search}%"
            query = query.filter(
                (Material.title.like(search_pattern)) | 
                (Material.content.like(search_pattern))
            )
        
        # 按创建时间倒序排列
        query = query.order_by(Material.created_at.desc())
        
        # 统计总数
        total = query.count()
        
        # 分页
        offset = (page - 1) * per_page
        materials = query.offset(offset).limit(per_page).all()
        
        # 格式化返回数据
        materials_data = []
        for material in materials:
            materials_data.append({
                "id": material.id,
                "title": material.title or "无标题",
                "content": material.content[:200] + "..." if len(material.content) > 200 else material.content,
                "content_full": material.content,
                "content_length": len(material.content),
                "source_type": material.source_type,
                "file_name": material.file_name,
                "created_at": material.created_at.isoformat()
            })
        
        logger.info(f"查询成功: 共 {total} 条，返回 {len(materials_data)} 条")
        
        return ApiResponse(
            code=200,
            message="success",
            data={
                "items": materials_data,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page
            }
        )
        
    except Exception as e:
        logger.error(f"获取素材列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.get("/api/materials/{material_id}", response_model=ApiResponse)
async def get_material(
    material_id: int,
    db: Session = Depends(get_db)
):
    """
    获取素材详情
    """
    logger.info(f"获取素材详情: id={material_id}")
    
    try:
        material = crud.get_material(db, material_id)
        
        if not material:
            logger.warning(f"素材不存在: id={material_id}")
            raise HTTPException(status_code=404, detail="素材不存在")
        
        return ApiResponse(
            code=200,
            message="success",
            data={
                "id": material.id,
                "title": material.title,
                "content": material.content,
                "source_type": material.source_type,
                "file_name": material.file_name,
                "created_at": material.created_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取素材失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.post("/api/materials/pdf", response_model=ApiResponse)
async def upload_pdf_material(
    file: UploadFile = File(...),
    source_type: str = "podcast",
    title: str = None,
    db: Session = Depends(get_db)
):
    """
    上传 PDF 素材
    
    上传 PDF 文件，自动提取文本内容并保存
    """
    logger.info(f"上传 PDF: filename={file.filename}, source={source_type}")
    
    try:
        # 1. 验证文件格式
        if not file.filename.lower().endswith('.pdf'):
            logger.warning(f"文件格式错误: {file.filename}")
            raise HTTPException(status_code=400, detail="仅支持 PDF 格式文件")
        
        # 2. 读取文件内容并检查大小
        file_content = await file.read()
        file_size = len(file_content)
        file_size_mb = file_size / (1024 * 1024)
        
        logger.info(f"文件大小: {file_size_mb:.2f} MB")
        
        if file_size_mb > settings.MAX_FILE_SIZE / (1024 * 1024):
            logger.warning(f"文件过大: {file_size_mb:.2f} MB")
            raise HTTPException(status_code=400, detail=f"文件过大，最大支持 50MB")
        
        # 3. 确保 uploads 目录存在
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # 4. 生成唯一文件名
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        # 5. 保存文件
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        logger.info(f"文件已保存: {file_path}")
        
        # 6. 提取 PDF 文本
        try:
            extracted_text = extract_text_from_pdf(file_path)
            word_count = len(extracted_text)
            logger.info(f"PDF 文本提取成功: {word_count} 字")
            
        except Exception as e:
            # 如果提取失败，删除上传的文件
            if os.path.exists(file_path):
                os.remove(file_path)
            logger.error(f"PDF 文本提取失败: {e}")
            raise HTTPException(
                status_code=400, 
                detail=f"PDF 解析失败: {str(e)}。请确保上传的是文本版 PDF（非扫描版）"
            )
        
        # 7. 保存到数据库
        material_data = {
            "title": title or file.filename,
            "content": extracted_text,
            "source_type": source_type,
            "file_name": file.filename
        }
        
        db_material = crud.create_material(db, material_data)
        
        logger.info(f"PDF 素材创建成功: id={db_material.id}")
        
        # 8. 返回成功响应
        return ApiResponse(
            code=200,
            message="PDF 上传成功",
            data={
                "id": db_material.id,
                "title": db_material.title,
                "file_name": db_material.file_name,
                "source_type": db_material.source_type,
                "word_count": word_count,
                "file_size_mb": round(file_size_mb, 2),
                "created_at": db_material.created_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"上传 PDF 失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

# ========== AI 提炼接口 ==========

@app.post("/api/ai/refine", response_model=ApiResponse)
async def refine_material(
    request: RefineRequest,
    db: Session = Depends(get_db)
):
    """
    AI 提炼素材内容

    使用 AI 根据选择的提示词提炼素材内容
    """
    logger.info(f"AI 提炼: material_id={request.material_id}, prompt_id={request.prompt_id}, model={request.model}")
    
    try:
        # 1. 获取素材
        material = crud.get_material(db, request.material_id)
        if not material:
            logger.warning(f"素材不存在: id={request.material_id}")
            raise HTTPException(status_code=404, detail="素材不存在")

        # 2. 获取提示词
        prompts = get_default_prompts()
        prompt_obj = next((p for p in prompts if p['id'] == request.prompt_id), None)

        if not prompt_obj:
            logger.warning(f"提示词不存在: id={request.prompt_id}")
            raise HTTPException(status_code=404, detail="提示词不存在")

        logger.info(f"使用提示词: {prompt_obj['name']}")

        # 3. 调用 AI 提炼
        try:
            result = refine_content(
                content=material.content,
                prompt=prompt_obj['content'],
                model=request.model,
                api_key=request.api_key
            )

            logger.info(f"AI 提炼成功: tokens={result['tokens_used']}, cost=${result['cost_usd']}")

            # 4. 返回结果
            return ApiResponse(
                code=200,
                message="提炼完成",
                data={
                    "refined_text": result['refined_text'],
                    "prompt_name": prompt_obj['name'],
                    "model_used": result['model_used'],
                    "tokens_used": result['tokens_used'],
                    "cost_usd": result['cost_usd'],
                    "material_id": request.material_id
                }
            )
            
        except ValueError as e:
            logger.error(f"参数错误: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            error_msg = str(e)
            logger.error(f"AI 调用失败: {error_msg}")
            
            # 友好的错误提示
            if "API Key" in error_msg or "api_key" in error_msg.lower():
                raise HTTPException(status_code=401, detail="API Key 未配置或无效，请在设置中配置")
            elif "timeout" in error_msg.lower():
                raise HTTPException(status_code=504, detail="AI 服务超时，请稍后重试")
            elif "rate limit" in error_msg.lower():
                raise HTTPException(status_code=429, detail="API 调用频率过高，请稍后重试")
            else:
                raise HTTPException(status_code=500, detail=f"AI 提炼失败: {error_msg}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提炼失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.get("/api/prompts", response_model=ApiResponse)
async def get_prompts():
    """
    获取所有提示词
    """
    logger.info("获取提示词列表")
    
    try:
        prompts = get_default_prompts()
        return ApiResponse(
            code=200,
            message="success",
            data={"prompts": prompts}  # 包装成字典
        )
    except Exception as e:
        logger.error(f"获取提示词失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.post("/api/topics/inspiration", response_model=ApiResponse)
async def generate_inspirations(
    request: TopicInspirationRequest,
    db: Session = Depends(get_db)
):
    """
    生成选题灵感

    基于现有素材，AI 自动推荐选题方向

    参数:
        material_ids: 指定素材 ID 列表（可选）
        source_type: 按来源筛选（可选）
        count: 生成几个建议（默认 5 个）
        model: AI 模型
        api_key: API Key（可选）
    """
    logger.info(f"生成选题灵感: material_ids={request.material_ids}, source_type={request.source_type}, count={request.count}")

    try:
        # 1. 获取素材列表
        if request.material_ids:
            # 根据指定 ID 获取素材
            materials = []
            for mat_id in request.material_ids:
                material = crud.get_material(db, mat_id)
                if material:
                    materials.append(material)
                else:
                    logger.warning(f"素材不存在: id={mat_id}")

            if not materials:
                raise HTTPException(status_code=404, detail="指定的素材不存在")
        else:
            # 获取所有素材或按来源筛选
            from models import Material
            query = db.query(Material)

            if request.source_type:
                query = query.filter(Material.source_type == request.source_type)

            materials = query.order_by(Material.created_at.desc()).limit(20).all()

            if not materials:
                raise HTTPException(status_code=404, detail="没有找到素材，请先添加素材")

        logger.info(f"找到 {len(materials)} 个素材用于生成灵感")

        # 2. 准备素材数据
        materials_data = [
            {
                'id': mat.id,
                'title': mat.title,
                'content': mat.content,
                'source_type': mat.source_type
            }
            for mat in materials
        ]

        # 3. 调用 AI 生成灵感
        from ai_service import generate_topic_inspirations

        try:
            result = generate_topic_inspirations(
                materials=materials_data,
                count=request.count,
                model=request.model,
                api_key=request.api_key
            )

            logger.info(f"生成灵感成功: count={len(result['inspirations'])}, tokens={result['tokens_used']}")

            # 4. 返回结果
            return ApiResponse(
                code=200,
                message="灵感生成成功",
                data={
                    "inspirations": result['inspirations'],
                    "materials_count": len(materials),
                    "model_used": result['model_used'],
                    "tokens_used": result['tokens_used'],
                    "cost_usd": result['cost_usd']
                }
            )

        except ValueError as e:
            logger.error(f"参数错误: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            error_msg = str(e)
            logger.error(f"AI 调用失败: {error_msg}")

            # 友好的错误提示
            if "API Key" in error_msg or "api_key" in error_msg.lower():
                raise HTTPException(status_code=401, detail="API Key 未配置或无效，请在设置中配置")
            elif "timeout" in error_msg.lower():
                raise HTTPException(status_code=504, detail="AI 服务超时，请稍后重试")
            else:
                raise HTTPException(status_code=500, detail=f"灵感生成失败: {error_msg}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成灵感失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.post("/api/refine/batch", response_model=ApiResponse)
async def batch_refine(
    request: BatchRefineRequest,
    db: Session = Depends(get_db)
):
    """
    批量提炼多个素材

    支持三种模式：
    - combine: 整合模式（保留所有信息）
    - compare: 对比模式（找出异同）
    - synthesize: 综合模式（生成新观点）

    参数:
        material_ids: 素材 ID 列表（2-5 个）
        prompt_id: 提示词 ID（可选）
        custom_prompt: 自定义提示词（可选）
        mode: 提炼模式
        model: AI 模型
        api_key: API Key（可选）
    """
    logger.info(f"批量提炼: material_ids={request.material_ids}, mode={request.mode}, count={len(request.material_ids)}")

    try:
        # 1. 验证参数
        if not request.material_ids or len(request.material_ids) < 2:
            raise HTTPException(status_code=400, detail="至少需要选择 2 个素材")

        if len(request.material_ids) > 5:
            raise HTTPException(status_code=400, detail="最多支持 5 个素材的批量提炼")

        if request.mode not in ['combine', 'compare', 'synthesize']:
            raise HTTPException(status_code=400, detail="模式错误，请选择 combine/compare/synthesize")

        # 2. 获取素材
        materials = []
        for mat_id in request.material_ids:
            material = crud.get_material(db, mat_id)
            if material:
                materials.append(material)
            else:
                logger.warning(f"素材不存在: id={mat_id}")
                raise HTTPException(status_code=404, detail=f"素材 {mat_id} 不存在")

        logger.info(f"找到 {len(materials)} 个素材")

        # 3. 准备提示词
        prompt_text = ""
        if request.custom_prompt:
            prompt_text = request.custom_prompt
            logger.info("使用自定义提示词")
        elif request.prompt_id:
            prompts = get_default_prompts()
            prompt_obj = next((p for p in prompts if p['id'] == request.prompt_id), None)
            if not prompt_obj:
                raise HTTPException(status_code=404, detail="提示词不存在")
            prompt_text = prompt_obj['content']
            logger.info(f"使用提示词: {prompt_obj['name']}")
        else:
            # 默认提示词
            prompt_text = "请对以下素材进行深度分析和提炼。"
            logger.info("使用默认提示词")

        # 4. 准备素材数据
        materials_data = [
            {
                'id': mat.id,
                'title': mat.title,
                'content': mat.content,
                'source_type': mat.source_type
            }
            for mat in materials
        ]

        # 5. 调用 AI 批量提炼
        from ai_service import batch_refine_materials

        try:
            result = batch_refine_materials(
                materials=materials_data,
                prompt=prompt_text,
                mode=request.mode,
                model=request.model,
                api_key=request.api_key
            )

            logger.info(f"批量提炼成功: mode={request.mode}, tokens={result['tokens_used']}")

            # 6. 返回结果
            return ApiResponse(
                code=200,
                message="批量提炼完成",
                data={
                    "refined_text": result['refined_text'],
                    "materials_count": result['materials_count'],
                    "mode": result['mode'],
                    "model_used": result['model_used'],
                    "tokens_used": result['tokens_used'],
                    "cost_usd": result['cost_usd'],
                    "material_ids": material_ids
                }
            )

        except ValueError as e:
            logger.error(f"参数错误: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            error_msg = str(e)
            logger.error(f"AI 调用失败: {error_msg}")

            # 友好的错误提示
            if "API Key" in error_msg or "api_key" in error_msg.lower():
                raise HTTPException(status_code=401, detail="API Key 未配置或无效，请在设置中配置")
            elif "timeout" in error_msg.lower():
                raise HTTPException(status_code=504, detail="AI 服务超时，请稍后重试")
            else:
                raise HTTPException(status_code=500, detail=f"批量提炼失败: {error_msg}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量提炼失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

# ========== 选题管理接口 ==========

from pydantic import BaseModel
from typing import List
import json

class TopicCreate(BaseModel):
    """创建选题的请求模型"""
    material_id: int
    title: str
    refined_content: str
    prompt_name: str = None
    tags: List[str]
    source_type: str = None

@app.post("/api/topics", response_model=ApiResponse)
async def create_topic(
    topic: TopicCreate,
    db: Session = Depends(get_db)
):
    """
    创建选题
    
    保存提炼后的内容为选题
    """
    logger.info(f"创建选题: title={topic.title}, tags={topic.tags}")
    
    try:
        # 1. 验证标题
        if not topic.title or not topic.title.strip():
            logger.warning("标题为空")
            raise HTTPException(status_code=400, detail="标题不能为空")
        
        if len(topic.title) > 200:
            logger.warning(f"标题过长: {len(topic.title)}")
            raise HTTPException(status_code=400, detail="标题最长200字")
        
        # 2. 验证内容
        if not topic.refined_content or not topic.refined_content.strip():
            logger.warning("内容为空")
            raise HTTPException(status_code=400, detail="内容不能为空")
        
        # 3. 验证标签
        if not topic.tags or len(topic.tags) == 0:
            logger.warning("标签为空")
            raise HTTPException(status_code=400, detail="至少需要一个标签")
        
        # 4. 验证素材是否存在
        material = crud.get_material(db, topic.material_id)
        if not material:
            logger.warning(f"素材不存在: id={topic.material_id}")
            raise HTTPException(status_code=404, detail="关联的素材不存在")
        
        # 5. 准备数据
        from models import Topic
        
        topic_data = {
            "material_id": topic.material_id,
            "title": topic.title.strip(),
            "refined_content": topic.refined_content.strip(),
            "prompt_name": topic.prompt_name,
            "tags": json.dumps(topic.tags, ensure_ascii=False),  # 转为JSON存储
            "source_type": topic.source_type or material.source_type
        }
        
        # 6. 保存到数据库
        db_topic = crud.create_topic(db, topic_data)
        
        logger.info(f"选题创建成功: id={db_topic.id}")
        
        # 7. 返回成功响应
        return ApiResponse(
            code=200,
            message="选题创建成功",
            data={
                "id": db_topic.id,
                "title": db_topic.title,
                "tags": json.loads(db_topic.tags),
                "created_at": db_topic.created_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建选题失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.get("/api/topics/{topic_id}", response_model=ApiResponse)
async def get_topic_detail(
    topic_id: int,
    db: Session = Depends(get_db)
):
    """
    获取选题详情
    
    包含完整的选题信息和关联的原始素材
    """
    logger.info(f"获取选题详情: id={topic_id}")
    
    try:
        from models import Topic
        
        # 查询选题
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        
        if not topic:
            logger.warning(f"选题不存在: id={topic_id}")
            raise HTTPException(status_code=404, detail="选题不存在")
        
        # 查询关联的素材
        material = crud.get_material(db, topic.material_id)
        
        # 格式化返回数据
        topic_data = {
            "id": topic.id,
            "material_id": topic.material_id,
            "title": topic.title,
            "refined_content": topic.refined_content,
            "prompt_name": topic.prompt_name,
            "tags": json.loads(topic.tags) if topic.tags else [],
            "source_type": topic.source_type,
            "created_at": topic.created_at.isoformat(),
            "updated_at": topic.updated_at.isoformat() if topic.updated_at else None,
            "material": {
                "id": material.id,
                "title": material.title,
                "content": material.content,
                "source_type": material.source_type,
                "file_name": material.file_name,
                "created_at": material.created_at.isoformat()
            } if material else None
        }
        
        logger.info(f"选题详情获取成功: id={topic_id}")
        
        return ApiResponse(
            code=200,
            message="success",
            data=topic_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取选题详情失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.put("/api/topics/{topic_id}", response_model=ApiResponse)
async def update_topic(
    topic_id: int,
    topic: TopicCreate,
    db: Session = Depends(get_db)
):
    """
    更新选题
    
    更新选题的标题、内容和标签
    """
    logger.info(f"更新选题: id={topic_id}, title={topic.title}")
    
    try:
        from models import Topic
        
        # 1. 查询选题是否存在
        db_topic = db.query(Topic).filter(Topic.id == topic_id).first()
        
        if not db_topic:
            logger.warning(f"选题不存在: id={topic_id}")
            raise HTTPException(status_code=404, detail="选题不存在")
        
        # 2. 验证标题
        if not topic.title or not topic.title.strip():
            logger.warning("标题为空")
            raise HTTPException(status_code=400, detail="标题不能为空")
        
        if len(topic.title) > 200:
            logger.warning(f"标题过长: {len(topic.title)}")
            raise HTTPException(status_code=400, detail="标题最长200字")
        
        # 3. 验证内容
        if not topic.refined_content or not topic.refined_content.strip():
            logger.warning("内容为空")
            raise HTTPException(status_code=400, detail="内容不能为空")
        
        # 4. 验证标签
        if not topic.tags or len(topic.tags) == 0:
            logger.warning("标签为空")
            raise HTTPException(status_code=400, detail="至少需要一个标签")
        
        # 5. 更新数据
        db_topic.title = topic.title.strip()
        db_topic.refined_content = topic.refined_content.strip()
        db_topic.tags = json.dumps(topic.tags, ensure_ascii=False)
        db_topic.prompt_name = topic.prompt_name
        
        # 更新时间会自动更新（onupdate）
        db.commit()
        db.refresh(db_topic)
        
        logger.info(f"选题更新成功: id={topic_id}")
        
        # 6. 返回更新后的数据
        return ApiResponse(
            code=200,
            message="选题更新成功",
            data={
                "id": db_topic.id,
                "title": db_topic.title,
                "tags": json.loads(db_topic.tags),
                "updated_at": db_topic.updated_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新选题失败: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.delete("/api/topics/{topic_id}", response_model=ApiResponse)
async def delete_topic(
    topic_id: int,
    db: Session = Depends(get_db)
):
    """
    删除选题
    
    根据 ID 删除选题
    """
    logger.info(f"删除选题: id={topic_id}")
    
    try:
        from models import Topic
        
        # 1. 查询选题是否存在
        db_topic = db.query(Topic).filter(Topic.id == topic_id).first()
        
        if not db_topic:
            logger.warning(f"选题不存在: id={topic_id}")
            raise HTTPException(status_code=404, detail="选题不存在")
        
        # 2. 删除选题
        db.delete(db_topic)
        db.commit()
        
        logger.info(f"选题删除成功: id={topic_id}")
        
        return ApiResponse(
            code=200,
            message="选题删除成功",
            data={"id": topic_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除选题失败: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.get("/api/topics", response_model=ApiResponse)
async def get_topics(
    page: int = 1,
    per_page: int = 20,
    tags: str = None,
    search: str = None,
    db: Session = Depends(get_db)
):
    """
    获取选题列表
    
    支持分页、标签筛选、关键词搜索
    """
    logger.info(f"获取选题列表: page={page}, per_page={per_page}, tags={tags}, search={search}")
    
    try:
        from models import Topic
        
        # 构建查询
        query = db.query(Topic)
        
        # 标签筛选
        if tags:
            logger.info(f"按标签筛选: {tags}")
            query = query.filter(Topic.tags.contains(tags))
        
        # 搜索
        if search:
            logger.info(f"搜索关键词: {search}")
            search_pattern = f"%{search}%"
            query = query.filter(
                (Topic.title.like(search_pattern)) | 
                (Topic.refined_content.like(search_pattern))
            )
        
        # 按创建时间倒序排列
        query = query.order_by(Topic.created_at.desc())
        
        # 统计总数
        total = query.count()
        
        # 分页
        offset = (page - 1) * per_page
        topics = query.offset(offset).limit(per_page).all()
        
        # 格式化返回数据
        topics_data = []
        for topic in topics:
            topics_data.append({
                "id": topic.id,
                "material_id": topic.material_id,
                "title": topic.title,
                "refined_content": topic.refined_content,
                "prompt_name": topic.prompt_name,
                "tags": json.loads(topic.tags) if topic.tags else [],
                "source_type": topic.source_type,
                "created_at": topic.created_at.isoformat(),
                "updated_at": topic.updated_at.isoformat() if topic.updated_at else None
            })
        
        logger.info(f"查询成功: 共 {total} 条，返回 {len(topics_data)} 条")
        
        return ApiResponse(
            code=200,
            message="success",
            data={
                "items": topics_data,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page
            }
        )
        
    except Exception as e:
        logger.error(f"获取选题列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

# ========== 配置管理接口 ==========

@app.get("/api/configs", response_model=ApiResponse)
async def get_configs(db: Session = Depends(get_db)):
    """
    获取所有配置
    """
    logger.info("获取配置信息")
    
    try:
        from models import Config
        
        # 查询所有配置
        configs = db.query(Config).all()
        
        # 格式化返回数据
        config_dict = {}
        for config in configs:
            config_dict[config.key] = config.value
        
        # 如果没有配置，返回默认值
        if not config_dict:
            config_dict = {
                "default_ai_model": "gpt-4",
                "openai_api_key": "",
                "claude_api_key": "",
                "preset_tags": json.dumps([
                    "商业思维", "科技趋势", "生活方式",
                    "创业故事", "个人成长", "情感励志"
                ], ensure_ascii=False)
            }
        
        logger.info(f"配置获取成功: {len(config_dict)} 项")
        
        return ApiResponse(
            code=200,
            message="success",
            data=config_dict
        )
        
    except Exception as e:
        logger.error(f"获取配置失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.put("/api/configs", response_model=ApiResponse)
async def update_configs(
    configs: dict,
    db: Session = Depends(get_db)
):
    """
    更新配置
    
    批量更新配置项
    """
    logger.info(f"更新配置: {list(configs.keys())}")
    
    try:
        from models import Config
        from datetime import datetime
        
        # 遍历配置项并更新
        for key, value in configs.items():
            # 查询配置是否存在
            config = db.query(Config).filter(Config.key == key).first()
            
            if config:
                # 更新现有配置
                config.value = value
                config.updated_at = datetime.now()
                logger.info(f"更新配置: {key}")
            else:
                # 创建新配置
                config = Config(key=key, value=value)
                db.add(config)
                logger.info(f"创建配置: {key}")
        
        db.commit()
        
        logger.info(f"配置更新成功: {len(configs)} 项")
        
        return ApiResponse(
            code=200,
            message="配置更新成功",
            data=configs
        )
        
    except Exception as e:
        logger.error(f"更新配置失败: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

if __name__ == "__main__":
    import uvicorn
    logger.info("启动 ContentHub API 服务器")
    uvicorn.run(app, host="0.0.0.0", port=8000)

