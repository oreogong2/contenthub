"""
日志脱敏过滤器

自动过滤和脱敏日志中的敏感信息，防止泄露
"""

import re
import logging


class SensitiveDataFilter(logging.Filter):
    """
    日志敏感数据过滤器

    自动检测和脱敏以下敏感信息：
    - API 密钥 (OpenAI, Claude, DeepSeek 等)
    - JWT Token
    - 密码
    - 邮箱地址
    - 电话号码
    - 身份证号
    - 信用卡号
    """

    # 敏感信息正则表达式模式
    PATTERNS = [
        # API 密钥
        (r'sk-[a-zA-Z0-9]{48,}', 'sk-***REDACTED***'),  # OpenAI API key
        (r'gsk-[a-zA-Z0-9]{48,}', 'gsk-***REDACTED***'),  # Groq API key
        (r'claude-[a-zA-Z0-9]{32,}', 'claude-***REDACTED***'),  # Claude API key
        (r'Bearer\s+[a-zA-Z0-9_\-\.]+', 'Bearer ***REDACTED***'),  # JWT Bearer Token

        # 常见密码字段
        (r'("password"\s*:\s*")[^"]+(")', r'\1***REDACTED***\2'),
        (r"('password'\s*:\s*')[^']+(')", r"\1***REDACTED***\2"),
        (r'(password=)[^\s&]+', r'\1***REDACTED***'),

        # API 密钥字段
        (r'("api_key"\s*:\s*")[^"]+(")', r'\1***REDACTED***\2'),
        (r"('api_key'\s*:\s*')[^']+(')", r"\1***REDACTED***\2"),
        (r'(api_key=)[^\s&]+', r'\1***REDACTED***'),

        # 加密密钥
        (r'("encryption_key"\s*:\s*")[^"]+(")', r'\1***REDACTED***\2'),
        (r'(encryption_key=)[^\s&]+', r'\1***REDACTED***'),

        # 数据库连接串中的密码
        (r'(://[^:]+:)[^@]+(@)', r'\1***REDACTED***\2'),

        # 邮箱地址（部分脱敏）
        (r'\b([a-zA-Z0-9._%+-]{1,3})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b',
         r'\1***@\2'),

        # 手机号（中国）- 部分脱敏
        (r'\b(1[3-9]\d)\d{4}(\d{4})\b', r'\1****\2'),

        # 身份证号 - 部分脱敏
        (r'\b(\d{6})\d{8}(\d{4})\b', r'\1********\2'),

        # 信用卡号 - 部分脱敏
        (r'\b(\d{4})\d{8,12}(\d{4})\b', r'\1********\2'),

        # Authorization header
        (r'(Authorization:\s*)[^\s]+', r'\1***REDACTED***'),
        (r'("authorization"\s*:\s*")[^"]+(")', r'\1***REDACTED***\2'),
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        """
        过滤日志记录中的敏感信息

        Args:
            record: 日志记录对象

        Returns:
            bool: 总是返回 True，允许日志通过（但已脱敏）
        """
        # 脱敏消息内容
        if hasattr(record, 'msg') and record.msg:
            record.msg = self._sanitize(str(record.msg))

        # 脱敏参数
        if hasattr(record, 'args') and record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: self._sanitize(str(v)) if isinstance(v, str) else v
                    for k, v in record.args.items()
                }
            elif isinstance(record.args, (list, tuple)):
                record.args = tuple(
                    self._sanitize(str(arg)) if isinstance(arg, str) else arg
                    for arg in record.args
                )

        return True

    def _sanitize(self, text: str) -> str:
        """
        脱敏文本内容

        Args:
            text: 原始文本

        Returns:
            str: 脱敏后的文本
        """
        for pattern, replacement in self.PATTERNS:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

        return text


def setup_logging_with_filter(logger: logging.Logger = None) -> logging.Logger:
    """
    为 logger 添加敏感数据过滤器

    Args:
        logger: 日志对象，如果为 None 则使用 root logger

    Returns:
        logging.Logger: 配置好的 logger
    """
    if logger is None:
        logger = logging.getLogger()

    # 添加敏感数据过滤器
    sensitive_filter = SensitiveDataFilter()
    logger.addFilter(sensitive_filter)

    # 为所有 handler 添加过滤器
    for handler in logger.handlers:
        handler.addFilter(sensitive_filter)

    return logger


def sanitize_dict(data: dict) -> dict:
    """
    脱敏字典中的敏感字段

    用于在返回 API 响应前脱敏数据

    Args:
        data: 原始字典

    Returns:
        dict: 脱敏后的字典
    """
    if not isinstance(data, dict):
        return data

    sensitive_keys = {
        'password', 'pwd', 'passwd',
        'api_key', 'apikey', 'api_token', 'token',
        'secret', 'secret_key',
        'encryption_key',
        'authorization', 'auth',
        'private_key', 'access_token', 'refresh_token'
    }

    sanitized = {}
    for key, value in data.items():
        key_lower = key.lower()

        # 检查是否为敏感字段
        if any(sensitive_key in key_lower for sensitive_key in sensitive_keys):
            if value:
                sanitized[key] = '***REDACTED***'
            else:
                sanitized[key] = value
        elif isinstance(value, dict):
            # 递归处理嵌套字典
            sanitized[key] = sanitize_dict(value)
        elif isinstance(value, list):
            # 处理列表
            sanitized[key] = [
                sanitize_dict(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            sanitized[key] = value

    return sanitized


# 使用示例
if __name__ == "__main__":
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # 添加敏感数据过滤器
    logger = setup_logging_with_filter(logging.getLogger())

    # 测试脱敏
    logger.info("API Key: sk-1234567890abcdef1234567890abcdef1234567890abcdef")
    logger.info("Password: my_secret_password_123")
    logger.info("Email: user@example.com")
    logger.info("Phone: 13812345678")
    logger.info("Bearer Token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    logger.info("Database URL: postgresql://user:password@localhost:5432/db")

    # 测试字典脱敏
    sensitive_data = {
        "username": "john_doe",
        "password": "secret123",
        "api_key": "sk-abc123",
        "email": "john@example.com",
        "data": {
            "token": "jwt_token_here",
            "value": "normal_value"
        }
    }

    sanitized = sanitize_dict(sensitive_data)
    print("\n原始数据:")
    print(sensitive_data)
    print("\n脱敏后:")
    print(sanitized)
