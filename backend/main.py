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

if __name__ == "__main__":
    import uvicorn
    logger.info("启动 ContentHub API 服务器")
    uvicorn.run(app, host="0.0.0.0", port=8000)

