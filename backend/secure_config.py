"""
文件名: secure_config.py
作用: 安全的配置管理（支持加密存储敏感信息）
作者: ContentHub Team
日期: 2025-10-26
最后更新: 2025-10-26
"""

from cryptography.fernet import Fernet
import os
import logging

logger = logging.getLogger(__name__)

class SecureConfigManager:
    """
    安全配置管理器

    用于加密和解密敏感配置信息（如 API Key）
    加密密钥从环境变量 CONFIG_ENCRYPTION_KEY 读取

    使用示例：
        manager = SecureConfigManager()
        encrypted = manager.encrypt("sk-proj-xxxxxx")
        decrypted = manager.decrypt(encrypted)
    """

    def __init__(self):
        """
        初始化配置管理器

        从环境变量读取加密密钥，如果不存在则生成新密钥
        """
        # 尝试从环境变量读取加密密钥
        key = os.getenv("CONFIG_ENCRYPTION_KEY")

        if not key:
            # 第一次运行时生成新密钥
            key = Fernet.generate_key()
            logger.warning(
                f"未找到 CONFIG_ENCRYPTION_KEY 环境变量，已生成新密钥。\n"
                f"请将以下密钥保存到环境变量或 .env 文件中：\n"
                f"CONFIG_ENCRYPTION_KEY={key.decode()}"
            )

        # 如果是字符串，转换为 bytes
        if isinstance(key, str):
            key = key.encode()

        try:
            self.cipher = Fernet(key)
            logger.info("加密管理器初始化成功")
        except Exception as e:
            logger.error(f"加密管理器初始化失败: {e}")
            raise ValueError("无效的加密密钥，请检查 CONFIG_ENCRYPTION_KEY 环境变量")

    def encrypt(self, value: str) -> str:
        """
        加密配置值

        参数:
            value (str): 需要加密的明文字符串

        返回:
            str: 加密后的字符串（Base64 编码）

        异常:
            ValueError: 当输入为空时
            Exception: 当加密失败时
        """
        if not value:
            raise ValueError("加密内容不能为空")

        try:
            encrypted_bytes = self.cipher.encrypt(value.encode())
            encrypted_str = encrypted_bytes.decode()
            logger.debug("配置值加密成功")
            return encrypted_str
        except Exception as e:
            logger.error(f"加密失败: {e}", exc_info=True)
            raise Exception(f"配置加密失败: {e}")

    def decrypt(self, encrypted_value: str) -> str:
        """
        解密配置值

        参数:
            encrypted_value (str): 加密后的字符串

        返回:
            str: 解密后的明文字符串

        异常:
            ValueError: 当输入为空时
            Exception: 当解密失败时（可能是密钥不匹配）
        """
        if not encrypted_value:
            raise ValueError("解密内容不能为空")

        try:
            decrypted_bytes = self.cipher.decrypt(encrypted_value.encode())
            decrypted_str = decrypted_bytes.decode()
            logger.debug("配置值解密成功")
            return decrypted_str
        except Exception as e:
            logger.error(f"解密失败: {e}", exc_info=True)
            raise Exception(
                f"配置解密失败，可能是加密密钥不匹配。"
                f"请检查 CONFIG_ENCRYPTION_KEY 环境变量是否正确。"
            )

    def is_encrypted(self, value: str) -> bool:
        """
        检查一个值是否已经被加密

        参数:
            value (str): 待检查的值

        返回:
            bool: True 表示已加密，False 表示未加密

        注意:
            这个方法通过尝试解密来判断，不是 100% 准确
        """
        try:
            self.decrypt(value)
            return True
        except:
            return False


# 定义需要加密的配置键
SENSITIVE_CONFIG_KEYS = {
    'openai_api_key',
    'claude_api_key',
    'deepseek_api_key',
    'gemini_api_key',
    # 未来可以添加其他敏感配置
}


def is_sensitive_config(key: str) -> bool:
    """
    判断配置键是否为敏感信息

    参数:
        key (str): 配置键名

    返回:
        bool: True 表示敏感，需要加密
    """
    return key.lower() in SENSITIVE_CONFIG_KEYS


# 创建全局单例
_secure_config_manager = None

def get_secure_config_manager() -> SecureConfigManager:
    """
    获取全局的安全配置管理器实例（单例模式）

    返回:
        SecureConfigManager: 配置管理器实例
    """
    global _secure_config_manager

    if _secure_config_manager is None:
        _secure_config_manager = SecureConfigManager()

    return _secure_config_manager
