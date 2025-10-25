"""
文件名: exceptions.py
作用: 统一异常处理
作者: ContentHub Team
日期: 2025-10-26
最后更新: 2025-10-26
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)


class BusinessException(Exception):
    """
    业务异常基类

    用于表示业务逻辑错误，而不是系统错误

    使用示例:
        if not user:
            raise BusinessException(404, "用户不存在")

        if password_incorrect:
            raise BusinessException(401, "密码错误")
    """

    def __init__(self, code: int, message: str, data=None):
        """
        初始化业务异常

        参数:
            code: 业务错误码（通常与 HTTP 状态码对应）
            message: 错误消息
            data: 附加数据（可选）
        """
        self.code = code
        self.message = message
        self.data = data
        super().__init__(self.message)


class NotFoundException(BusinessException):
    """资源不存在异常"""

    def __init__(self, message: str = "资源不存在"):
        super().__init__(404, message)


class ValidationException(BusinessException):
    """参数验证异常"""

    def __init__(self, message: str = "参数验证失败"):
        super().__init__(400, message)


class UnauthorizedException(BusinessException):
    """未授权异常"""

    def __init__(self, message: str = "未授权访问"):
        super().__init__(401, message)


class ForbiddenException(BusinessException):
    """禁止访问异常"""

    def __init__(self, message: str = "禁止访问"):
        super().__init__(403, message)


class ConflictException(BusinessException):
    """资源冲突异常"""

    def __init__(self, message: str = "资源冲突"):
        super().__init__(409, message)


class TooManyRequestsException(BusinessException):
    """请求过于频繁异常"""

    def __init__(self, message: str = "请求过于频繁，请稍后再试"):
        super().__init__(429, message)


class InternalServerException(BusinessException):
    """服务器内部错误异常"""

    def __init__(self, message: str = "服务器内部错误"):
        super().__init__(500, message)


# ========== 异常处理器 ==========

async def business_exception_handler(request: Request, exc: BusinessException):
    """
    业务异常处理器

    捕获 BusinessException 及其子类，返回统一的 JSON 响应

    参数:
        request: FastAPI 请求对象
        exc: 业务异常对象

    返回:
        JSONResponse: 统一格式的错误响应
    """
    # 记录日志（业务异常通常是预期的，使用 WARNING 级别）
    logger.warning(
        f"业务异常: code={exc.code}, message={exc.message}, "
        f"path={request.url.path}"
    )

    return JSONResponse(
        status_code=200,  # HTTP 状态码仍然是 200（业务错误不是 HTTP 错误）
        content={
            "code": exc.code,
            "message": exc.message,
            "data": exc.data
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    参数验证异常处理器

    捕获 Pydantic 的验证错误，返回友好的错误消息

    参数:
        request: FastAPI 请求对象
        exc: 参数验证异常对象

    返回:
        JSONResponse: 统一格式的错误响应
    """
    # 提取验证错误信息
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error['loc'])
        message = error['msg']
        errors.append(f"{field}: {message}")

    error_message = "; ".join(errors)

    logger.warning(
        f"参数验证失败: path={request.url.path}, errors={error_message}"
    )

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "code": 400,
            "message": f"参数验证失败: {error_message}",
            "data": None
        }
    )


async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    数据库异常处理器

    捕获 SQLAlchemy 的数据库错误

    参数:
        request: FastAPI 请求对象
        exc: 数据库异常对象

    返回:
        JSONResponse: 统一格式的错误响应
    """
    # 记录完整的错误信息（包括堆栈）
    logger.error(
        f"数据库错误: path={request.url.path}, error={exc}",
        exc_info=True
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": 500,
            "message": "数据库操作失败，请稍后重试",
            "data": None
        }
    )


async def global_exception_handler(request: Request, exc: Exception):
    """
    全局异常处理器

    捕获所有未处理的异常，防止泄露敏感信息

    参数:
        request: FastAPI 请求对象
        exc: 异常对象

    返回:
        JSONResponse: 统一格式的错误响应
    """
    # 记录完整的错误信息（包括堆栈）
    logger.error(
        f"未处理的异常: path={request.url.path}, "
        f"error={type(exc).__name__}: {exc}",
        exc_info=True
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": 500,
            "message": "服务器内部错误，请稍后重试",
            "data": None
        }
    )


def register_exception_handlers(app):
    """
    注册所有异常处理器到 FastAPI 应用

    在 main.py 中调用此函数来启用统一异常处理

    使用示例:
        from fastapi import FastAPI
        from exceptions import register_exception_handlers

        app = FastAPI()
        register_exception_handlers(app)

    参数:
        app: FastAPI 应用实例
    """
    # 注册业务异常处理器
    app.add_exception_handler(BusinessException, business_exception_handler)

    # 注册参数验证异常处理器
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    # 注册数据库异常处理器
    app.add_exception_handler(SQLAlchemyError, database_exception_handler)

    # 注册全局异常处理器（捕获所有未处理的异常）
    app.add_exception_handler(Exception, global_exception_handler)

    logger.info("异常处理器注册完成")
