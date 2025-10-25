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
from schemas import MaterialCreate, MaterialResponse, ApiResponse
import crud
import os
import uuid
from pdf_service import extract_text_from_pdf, validate_pdf_file
from config import settings

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

if __name__ == "__main__":
    import uvicorn
    logger.info("启动 ContentHub API 服务器")
    uvicorn.run(app, host="0.0.0.0", port=8000)

