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

# 启用日志脱敏过滤器（防止敏感信息泄露）
from log_filter import setup_logging_with_filter
setup_logging_with_filter()

logger = logging.getLogger(__name__)
logger.info("🔒 日志脱敏过滤器已启用")

# 创建 FastAPI 应用
app = FastAPI(
    title="ContentHub API",
    description="短视频选题素材管理器 API",
    version="1.0.0"
)

# 配置 CORS（允许前端跨域访问）
# 注意：Chrome 扩展 ID 可以在 chrome://extensions/ 中查看
# 开发环境可以使用通配符，生产环境必须指定具体的扩展 ID
import os

CHROME_EXTENSION_ID = os.getenv('CHROME_EXTENSION_ID', '*')  # 从环境变量读取

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

# 开发环境允许所有Chrome扩展，生产环境只允许指定ID
if CHROME_EXTENSION_ID == '*':
    # 开发模式：允许所有扩展（仅用于开发）
    logger.warning("⚠️  CORS配置使用通配符，仅供开发使用！")
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"chrome-extension://.*",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )
else:
    # 生产模式：只允许指定的扩展ID
    allowed_origins.append(f"chrome-extension://{CHROME_EXTENSION_ID}")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
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
from schemas import MaterialCreate, MaterialResponse, ApiResponse, RefineRequest, TagCreate, TagUpdate, TagResponse, MaterialTagUpdate
import crud
import os
import uuid
from pdf_service import extract_text_from_pdf, validate_pdf_file
from config import settings
from ai_service import refine_content, get_default_prompts
from image_service import process_url_for_images, cleanup_image_files

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
            "source_type": material.source_type,
            "source_url": material.source_url if hasattr(material, 'source_url') else None
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
    tag: str = None,
    db: Session = Depends(get_db)
):
    """
    获取素材列表
    
    支持分页、搜索、来源筛选、标签筛选
    """
    logger.info(f"获取素材列表: page={page}, per_page={per_page}, search={search}, source_type={source_type}, tag={tag}")
    
    try:
        from models import Material
        import json
        
        # 构建查询（只查询未删除的素材）
        query = db.query(Material).filter(Material.is_deleted == 0)
        
        # 来源筛选
        if source_type:
            logger.info(f"按来源筛选: {source_type}")
            query = query.filter(Material.source_type == source_type)
        
        # 标签筛选
        if tag:
            logger.info(f"按标签筛选: {tag}")
            # 转义特殊字符防止SQL注入
            tag_escaped = tag.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_').replace('"', '\\"')
            # 使用JSON函数查询tags字段中包含指定标签的素材
            query = query.filter(Material.tags.like(f'%"{tag_escaped}"%', escape='\\'))

        # 搜索
        if search:
            logger.info(f"搜索关键词: {search}")
            # 转义特殊字符防止SQL注入
            search_escaped = search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
            search_pattern = f"%{search_escaped}%"
            query = query.filter(
                (Material.title.like(search_pattern, escape='\\')) |
                (Material.content.like(search_pattern, escape='\\'))
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
            # 解析tags字段
            tags = []
            if material.tags:
                try:
                    import json
                    tags = json.loads(material.tags)
                except:
                    tags = []
            
            materials_data.append({
                "id": material.id,
                "title": material.title or "无标题",
                "content": material.content[:200] + "..." if len(material.content) > 200 else material.content,
                "content_full": material.content,
                "content_length": len(material.content),
                "source_type": material.source_type,
                "file_name": material.file_name,
                "tags": tags,
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

@app.delete("/api/materials/{material_id}", response_model=ApiResponse)
async def delete_material(
    material_id: int,
    db: Session = Depends(get_db)
):
    """
    删除素材
    """
    logger.info(f"删除素材: id={material_id}")
    
    try:
        material = crud.get_material(db, material_id)
        if not material:
            raise HTTPException(status_code=404, detail="素材不存在")
        
        crud.delete_material(db, material_id)
        
        return ApiResponse(
            code=200,
            message="success",
            data={"deleted_id": material_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除素材失败: {e}", exc_info=True)
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
    包含完整的安全验证：文件名净化、MIME 类型验证、PDF 结构验证
    """
    logger.info(f"上传 PDF: filename={file.filename}, source={source_type}")

    try:
        from file_security import validate_upload_file, FileValidationError

        # 1. 读取文件内容
        file_content = await file.read()

        # 2. 完整的安全验证
        try:
            safe_filename, file_size_mb = validate_upload_file(
                filename=file.filename,
                file_content=file_content,
                max_size_mb=50,
                allowed_extensions={'.pdf'}
            )
        except FileValidationError as e:
            logger.warning(f"文件验证失败: {e}")
            raise HTTPException(status_code=400, detail=str(e))

        logger.info(f"文件验证通过: {safe_filename} ({file_size_mb:.2f}MB)")

        # 3. 确保 uploads 目录存在
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        # 4. 生成唯一文件名（保持扩展名）
        file_ext = os.path.splitext(safe_filename)[1]
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
            "title": title or safe_filename,
            "content": extracted_text,
            "source_type": source_type,
            "file_name": safe_filename  # 使用净化后的文件名
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

@app.post("/api/materials/url", response_model=ApiResponse)
async def create_url_material(
    url: str,
    source_type: str = None,
    title: str = None,
    db: Session = Depends(get_db)
):
    """
    通过URL创建素材
    
    支持从网页或图片URL提取文字内容
    """
    logger.info(f"处理URL素材: {url}")
    
    try:
        # 1. 验证URL
        if not url or not url.strip():
            logger.warning("URL为空")
            raise HTTPException(status_code=400, detail="URL不能为空")
        
        url = url.strip()
        
        # 2. 验证URL格式
        if not url.startswith(('http://', 'https://')):
            logger.warning(f"URL格式错误: {url}")
            raise HTTPException(status_code=400, detail="URL格式错误，必须以http://或https://开头")
        
        # 3. 处理URL，提取图片和文字
        try:
            result = process_url_for_images(url)
            logger.info(f"URL处理成功: 找到{len(result['images'])}个图片")
            
        except Exception as e:
            logger.error(f"URL处理失败: {e}")
            raise HTTPException(status_code=400, detail=f"处理URL失败: {str(e)}")
        
        # 4. 检查是否提取到文字
        if not result['total_text'] or result['total_text'].strip() == "":
            logger.warning("未提取到任何文字内容")
            raise HTTPException(status_code=400, detail="未从图片中提取到文字内容")
        
        # 5. 准备数据
        material_data = {
            "title": title or f"来自{result['source_type']}的素材",
            "content": result['total_text'],
            "source_type": source_type or result['source_type']
        }
        
        # 6. 保存到数据库
        db_material = crud.create_material(db, material_data)
        
        logger.info(f"URL素材创建成功: id={db_material.id}")
        
        # 7. 清理临时文件（可选，也可以保留用于后续处理）
        # cleanup_image_files([img['file_path'] for img in result['images']])
        
        # 8. 返回成功响应
        return ApiResponse(
            code=200,
            message="URL素材创建成功",
            data={
                "id": db_material.id,
                "title": db_material.title,
                "source_type": db_material.source_type,
                "content_length": len(db_material.content),
                "images_count": len(result['images']),
                "original_url": url,
                "created_at": db_material.created_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建URL素材失败: {e}", exc_info=True)
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
        prompts = []
        try:
            # 尝试从数据库配置获取提示词
            config = crud.get_config(db, "default_prompts")
            if config and config.value:
                prompts = json.loads(config.value)
                logger.info(f"从数据库获取提示词: {len(prompts)} 个")
            else:
                prompts = get_default_prompts()
                logger.info(f"使用默认提示词: {len(prompts)} 个")
        except Exception as e:
            logger.warning(f"从数据库获取提示词失败: {e}")
            prompts = get_default_prompts()
            logger.info(f"使用默认提示词: {len(prompts)} 个")
        
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
                api_key=None
            )
            
            logger.info(f"AI 提炼成功: tokens={result['tokens_used']}, cost=${result['cost_usd']}")
            
            # 4. 记录使用统计
            try:
                from datetime import datetime
                crud.create_or_update_usage_stats(
                    db=db,
                    date=datetime.now().strftime('%Y-%m-%d'),
                    model=result['model_used'],
                    requests=1,
                    tokens=result['tokens_used'],
                    cost=result['cost_usd']
                )
                logger.info("使用统计记录成功")
            except Exception as e:
                logger.warning(f"记录使用统计失败: {e}")
            
            # 5. 返回结果
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
async def get_prompts(db: Session = Depends(get_db)):
    """
    获取所有提示词
    """
    logger.info("获取提示词列表")
    
    try:
        # 尝试从数据库配置获取提示词
        try:
            config = crud.get_config(db, "default_prompts")
            if config and config.value:
                prompts = json.loads(config.value)
                logger.info(f"从数据库获取提示词: {len(prompts)} 个")
                return ApiResponse(
                    code=200,
                    message="success",
                    data={"prompts": prompts}
                )
        except Exception as e:
            logger.warning(f"从数据库获取提示词失败: {e}")
        
        # 如果数据库没有配置，使用默认提示词
        prompts = get_default_prompts()
        logger.info(f"使用默认提示词: {len(prompts)} 个")
        return ApiResponse(
            code=200,
            message="success",
            data={"prompts": prompts}
        )
    except Exception as e:
        logger.error(f"获取提示词失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.post("/api/ai/discover-topics", response_model=ApiResponse)
async def discover_topics(
    db: Session = Depends(get_db)
):
    """
    发现选题灵感 - 分析素材库内容并推荐选题
    """
    logger.info("开始发现选题灵感")
    
    try:
        # 获取所有素材
        materials = crud.get_all_materials(db)
        if not materials:
            return ApiResponse(
                code=200,
                message="success",
                data={"topics": [], "message": "素材库为空，请先添加一些素材"}
            )
        
        # 提取素材内容进行分析
        all_content = []
        for material in materials:
            content = f"标题: {material.title}\n内容: {material.content[:500]}"
            all_content.append(content)
        
        combined_content = "\n\n".join(all_content)
        
        # 使用AI分析并生成选题建议
        from ai_service import discover_topic_ideas
        
        # 尝试获取自定义选题提示词
        custom_prompt = None
        try:
            config = crud.get_config(db, "topic_inspiration_prompt")
            if config and config.value:
                custom_prompt = config.value
                logger.info("使用自定义选题提示词")
        except Exception as e:
            logger.warning(f"获取自定义选题提示词失败: {e}")
        
        topic_ideas = await discover_topic_ideas(combined_content, custom_prompt)
        
        return ApiResponse(
            code=200,
            message="success",
            data={"topics": topic_ideas}
        )
        
    except Exception as e:
        logger.error(f"发现选题灵感失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.post("/api/ai/set-topic-prompt", response_model=ApiResponse)
async def set_topic_prompt(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    设置选题灵感提示词
    """
    logger.info("设置选题灵感提示词")
    
    try:
        prompt = request.get('prompt', '').strip()
        if not prompt:
            raise HTTPException(status_code=400, detail="提示词不能为空")
        
        # 保存到数据库配置
        crud.create_or_update_config(db, "topic_inspiration_prompt", prompt)
        
        return ApiResponse(
            code=200,
            message="选题提示词设置成功",
            data={"prompt": prompt}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"设置选题提示词失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.get("/api/ai/get-topic-prompt", response_model=ApiResponse)
async def get_topic_prompt(db: Session = Depends(get_db)):
    """
    获取选题灵感提示词
    """
    logger.info("获取选题灵感提示词")
    
    try:
        config = crud.get_config(db, "topic_inspiration_prompt")
        prompt = config.value if config and config.value else ""
        
        return ApiResponse(
            code=200,
            message="success",
            data={"prompt": prompt}
        )
        
    except Exception as e:
        logger.error(f"获取选题提示词失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.put("/api/prompts", response_model=ApiResponse)
async def update_prompts(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    更新提示词列表
    """
    logger.info("更新提示词列表")
    
    try:
        prompts = request.get('prompts', [])
        if not isinstance(prompts, list):
            raise HTTPException(status_code=400, detail="提示词格式错误")
        
        # 保存到数据库配置
        crud.create_or_update_config(db, "default_prompts", json.dumps(prompts))
        
        return ApiResponse(
            code=200,
            message="提示词更新成功",
            data={"prompts": prompts}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新提示词失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.delete("/api/prompts/{prompt_id}", response_model=ApiResponse)
async def delete_prompt(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """
    删除指定提示词
    """
    logger.info(f"删除提示词: id={prompt_id}")
    
    try:
        # 获取当前提示词列表
        config = crud.get_config(db, "default_prompts")
        if not config or not config.value:
            prompts = get_default_prompts()
        else:
            prompts = json.loads(config.value)
        
        # 查找并删除指定提示词
        original_count = len(prompts)
        prompts = [p for p in prompts if p.get('id') != prompt_id]
        
        if len(prompts) == original_count:
            raise HTTPException(status_code=404, detail="提示词不存在")
        
        # 保存更新后的提示词列表
        crud.create_or_update_config(db, "default_prompts", json.dumps(prompts))
        
        return ApiResponse(
            code=200,
            message="提示词删除成功",
            data={"deleted_id": prompt_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除提示词失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

# ========== 标签管理接口 ==========

@app.get("/api/tags", response_model=ApiResponse)
async def get_tags(db: Session = Depends(get_db)):
    """
    获取所有标签
    """
    logger.info("获取标签列表")
    
    try:
        tags = crud.get_all_tags(db)
        tag_list = []
        
        for tag in tags:
            tag_list.append({
                "id": tag.id,
                "name": tag.name,
                "color": tag.color,
                "usage_count": tag.usage_count,
                "is_preset": bool(tag.is_preset),
                "created_at": tag.created_at
            })
        
        return ApiResponse(
            code=200,
            message="success",
            data={"tags": tag_list}
        )
        
    except Exception as e:
        logger.error(f"获取标签失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.post("/api/tags", response_model=ApiResponse)
async def create_tag(
    tag_data: TagCreate,
    db: Session = Depends(get_db)
):
    """
    创建新标签
    """
    logger.info(f"创建标签: name={tag_data.name}")
    
    try:
        # 检查标签是否已存在
        existing_tag = crud.get_tag_by_name(db, tag_data.name)
        if existing_tag:
            return ApiResponse(
                code=400,
                message="标签已存在",
                data=None
            )
        
        # 创建新标签
        tag = crud.create_tag(db, tag_data.name, tag_data.color)
        
        return ApiResponse(
            code=200,
            message="success",
            data={
                "id": tag.id,
                "name": tag.name,
                "color": tag.color,
                "usage_count": tag.usage_count,
                "is_preset": bool(tag.is_preset),
                "created_at": tag.created_at
            }
        )
        
    except Exception as e:
        logger.error(f"创建标签失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.put("/api/materials/tags", response_model=ApiResponse)
async def update_material_tags(
    update_data: MaterialTagUpdate,
    db: Session = Depends(get_db)
):
    """
    批量更新素材标签
    """
    logger.info(f"更新素材标签: material_ids={update_data.material_ids}, tags={update_data.tags}")
    
    try:
        import json
        
        # 更新每个素材的标签
        for material_id in update_data.material_ids:
            material = crud.get_material(db, material_id)
            if material:
                # 更新素材标签
                material.tags = json.dumps(update_data.tags, ensure_ascii=False)
                db.commit()
                
                # 更新标签使用次数
                for tag_name in update_data.tags:
                    crud.update_tag_usage_count(db, tag_name)
        
        return ApiResponse(
            code=200,
            message="success",
            data={"updated_count": len(update_data.material_ids)}
        )
        
    except Exception as e:
        logger.error(f"更新素材标签失败: {e}", exc_info=True)
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
            # 转义特殊字符防止SQL注入
            search_escaped = search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
            search_pattern = f"%{search_escaped}%"
            query = query.filter(
                (Topic.title.like(search_pattern, escape='\\')) |
                (Topic.refined_content.like(search_pattern, escape='\\'))
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
    获取所有配置（API 密钥将被脱敏处理）
    """
    logger.info("获取配置信息")

    try:
        from models import Config

        # 需要脱敏的配置项
        API_KEY_FIELDS = {
            'openai_api_key',
            'deepseek_api_key',
            'claude_api_key',
            'anthropic_api_key',
            'gemini_api_key'
        }

        # 查询所有配置
        configs = db.query(Config).all()

        # 格式化返回数据
        config_dict = {}
        for config in configs:
            # 对 API 密钥进行脱敏处理
            if config.key in API_KEY_FIELDS and config.value:
                # 显示前缀提示用户已设置，但不泄露实际内容
                if len(config.value) > 10:
                    config_dict[config.key] = f"{'*' * 8}...已设置"
                else:
                    config_dict[config.key] = "已设置"
            else:
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

    批量更新配置项（自动加密 API 密钥）
    """
    logger.info(f"更新配置: {list(configs.keys())}")

    try:
        from models import Config
        from datetime import datetime
        from crypto_utils import encrypt_api_key

        # 需要加密的配置项
        API_KEY_FIELDS = {
            'openai_api_key',
            'deepseek_api_key',
            'claude_api_key',
            'anthropic_api_key',
            'gemini_api_key'
        }

        # 遍历配置项并更新
        for key, value in configs.items():
            # 查询配置是否存在
            config = db.query(Config).filter(Config.key == key).first()

            # 如果是 API 密钥，则加密存储
            if key in API_KEY_FIELDS and value:
                try:
                    encrypted_value = encrypt_api_key(value)
                    logger.info(f"已加密 API 密钥: {key}")
                    store_value = encrypted_value
                except Exception as e:
                    logger.error(f"加密 API 密钥失败: {key}, {e}")
                    # 如果加密失败，仍然存储原始值（向后兼容）
                    store_value = value
            else:
                store_value = value

            if config:
                # 更新现有配置
                config.value = store_value
                config.updated_at = datetime.now()
                logger.info(f"更新配置: {key}")
            else:
                # 创建新配置
                config = Config(key=key, value=store_value)
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

# ========== 使用统计接口 ==========

@app.get("/api/usage-stats", response_model=ApiResponse)
async def get_usage_stats(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    获取使用统计
    """
    logger.info(f"获取使用统计: 最近{days}天")
    
    try:
        summary = crud.get_usage_stats_summary(db, days)
        
        return ApiResponse(
            code=200,
            message="success",
            data=summary
        )
        
    except Exception as e:
        logger.error(f"获取使用统计失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.post("/api/usage-stats", response_model=ApiResponse)
async def record_usage_stats(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    记录使用统计
    """
    logger.info("记录使用统计")
    
    try:
        from datetime import datetime
        
        date = request.get('date', datetime.now().strftime('%Y-%m-%d'))
        model = request.get('model', 'unknown')
        requests = request.get('requests', 1)
        tokens = request.get('tokens', 0)
        cost = request.get('cost', 0.0)
        
        crud.create_or_update_usage_stats(db, date, model, requests, tokens, cost)
        
        return ApiResponse(
            code=200,
            message="使用统计记录成功",
            data={"date": date, "model": model}
        )
        
    except Exception as e:
        logger.error(f"记录使用统计失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

# ========== 回收站接口 ==========

@app.get("/api/recycle-bin", response_model=ApiResponse)
async def get_recycle_bin_materials(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    """
    获取回收站中的素材
    """
    logger.info(f"获取回收站素材: page={page}, per_page={per_page}")
    
    try:
        from models import Material
        import json
        
        # 查询已删除的素材
        query = db.query(Material).filter(Material.is_deleted == 1)
        
        # 按删除时间倒序排列
        query = query.order_by(Material.deleted_at.desc())
        
        # 统计总数
        total = query.count()
        
        # 分页
        offset = (page - 1) * per_page
        materials = query.offset(offset).limit(per_page).all()
        
        # 格式化返回数据
        materials_data = []
        for material in materials:
            # 解析tags字段
            tags = []
            if material.tags:
                try:
                    tags = json.loads(material.tags)
                except:
                    tags = []
            
            materials_data.append({
                "id": material.id,
                "title": material.title,
                "content": material.content[:200] + "..." if len(material.content) > 200 else material.content,
                "content_full": material.content_full or material.content,
                "content_length": material.content_length or len(material.content),
                "source_type": material.source_type,
                "file_name": material.file_name,
                "tags": tags,
                "created_at": material.created_at.isoformat(),
                "updated_at": material.updated_at.isoformat() if material.updated_at else None,
                "deleted_at": material.deleted_at.isoformat() if material.deleted_at else None
            })
        
        logger.info(f"回收站查询成功: 共 {total} 条，返回 {len(materials_data)} 条")
        
        return ApiResponse(
            code=200,
            message="success",
            data={
                "materials": materials_data,
                "total": total,
                "page": page,
                "per_page": per_page
            }
        )
        
    except Exception as e:
        logger.error(f"获取回收站素材失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.post("/api/materials/{material_id}/restore", response_model=ApiResponse)
async def restore_material(
    material_id: int,
    db: Session = Depends(get_db)
):
    """
    恢复素材
    """
    logger.info(f"恢复素材: id={material_id}")
    
    try:
        material = crud.restore_material(db, material_id)
        if material:
            return ApiResponse(
                code=200,
                message="素材恢复成功",
                data={"material_id": material_id}
            )
        else:
            raise HTTPException(status_code=404, detail="素材不存在")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"恢复素材失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

@app.delete("/api/materials/{material_id}/permanent", response_model=ApiResponse)
async def permanent_delete_material(
    material_id: int,
    db: Session = Depends(get_db)
):
    """
    永久删除素材
    """
    logger.info(f"永久删除素材: id={material_id}")
    
    try:
        material = crud.permanent_delete_material(db, material_id)
        if material:
            return ApiResponse(
                code=200,
                message="素材已永久删除",
                data={"material_id": material_id}
            )
        else:
            raise HTTPException(status_code=404, detail="素材不存在")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"永久删除素材失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="服务器内部错误")

# ========== OCR 识别接口 ==========

from pydantic import BaseModel
from typing import List

class OCRRequest(BaseModel):
    """OCR 请求模型"""
    image_urls: List[str] = Field(..., description="图片URL列表")

@app.post("/api/ocr/batch", response_model=ApiResponse)
async def batch_ocr(
    request: OCRRequest,
    db: Session = Depends(get_db)
):
    """
    批量 OCR 识别图片

    接收图片 URL 列表，下载并识别文字
    """
    logger.info(f"批量 OCR 识别: {len(request.image_urls)} 张图片")

    try:
        from image_service import download_image_from_url, extract_text_from_image

        results = []

        for index, image_url in enumerate(request.image_urls, 1):
            result = {
                "index": index,
                "url": image_url,
                "text": "",
                "success": False,
                "error": None
            }

            try:
                # 下载图片
                logger.info(f"[{index}/{len(request.image_urls)}] 下载图片: {image_url}")
                image_path = download_image_from_url(image_url, timeout=10)

                # OCR 识别
                logger.info(f"[{index}/{len(request.image_urls)}] 开始 OCR 识别")
                text = extract_text_from_image(image_path)

                result["text"] = text
                result["success"] = True

                logger.info(f"[{index}/{len(request.image_urls)}] OCR 成功: {len(text)} 字")

                # 删除临时文件
                if os.path.exists(image_path):
                    os.remove(image_path)

            except Exception as e:
                error_msg = str(e)
                logger.error(f"[{index}/{len(request.image_urls)}] OCR 失败: {error_msg}")
                result["error"] = error_msg
                result["text"] = "识别失败"

            results.append(result)

        # 统计成功率
        success_count = sum(1 for r in results if r["success"])

        logger.info(f"批量 OCR 完成: {success_count}/{len(request.image_urls)} 成功")

        return ApiResponse(
            code=200,
            message=f"OCR 识别完成",
            data={
                "total": len(request.image_urls),
                "success": success_count,
                "failed": len(request.image_urls) - success_count,
                "results": results
            }
        )

    except Exception as e:
        logger.error(f"批量 OCR 失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="OCR 服务错误")

if __name__ == "__main__":
    import uvicorn
    logger.info("启动 ContentHub API 服务器")
    uvicorn.run(app, host="0.0.0.0", port=8000)

