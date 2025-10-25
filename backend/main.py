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

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import MaterialCreate, MaterialResponse, ApiResponse
import crud

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

if __name__ == "__main__":
    import uvicorn
    logger.info("启动 ContentHub API 服务器")
    uvicorn.run(app, host="0.0.0.0", port=8000)

