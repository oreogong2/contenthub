"""
文件名: crypto_utils.py
作用: API 密钥加密/解密工具
作者: ContentHub Team
日期: 2025-10-26
"""

from cryptography.fernet import Fernet
import os
import base64
import hashlib

class CryptoManager:
    """API 密钥加密管理器"""

    def __init__(self):
        """初始化加密管理器"""
        # 从环境变量获取加密密钥
        # 如果不存在，使用机器ID生成（仅开发环境）
        encryption_key = os.getenv('ENCRYPTION_KEY')

        if not encryption_key:
            # 开发环境：使用机器标识生成密钥
            machine_id = self._get_machine_id()
            encryption_key = base64.urlsafe_b64encode(
                hashlib.sha256(machine_id.encode()).digest()
            ).decode()
            print(f"⚠️  警告：使用自动生成的加密密钥（仅供开发）")
            print(f"   生产环境请设置环境变量 ENCRYPTION_KEY")

        try:
            self.cipher = Fernet(encryption_key.encode())
        except Exception as e:
            raise ValueError(f"加密密钥格式错误: {e}")

    def _get_machine_id(self) -> str:
        """获取机器唯一标识"""
        # 尝试多种方式获取机器标识
        try:
            # 方式1：读取机器ID文件（Linux/Mac）
            if os.path.exists('/etc/machine-id'):
                with open('/etc/machine-id', 'r') as f:
                    return f.read().strip()

            # 方式2：使用主机名
            import socket
            return socket.gethostname()
        except:
            # 兜底：使用固定字符串（不安全，仅开发）
            return "contenthub-dev-machine"

    def encrypt(self, plaintext: str) -> str:
        """
        加密字符串

        参数:
            plaintext: 明文字符串

        返回:
            加密后的字符串（Base64编码）
        """
        if not plaintext:
            return ""

        try:
            encrypted = self.cipher.encrypt(plaintext.encode())
            return encrypted.decode()
        except Exception as e:
            raise ValueError(f"加密失败: {e}")

    def decrypt(self, ciphertext: str) -> str:
        """
        解密字符串

        参数:
            ciphertext: 密文字符串（Base64编码）

        返回:
            解密后的明文字符串
        """
        if not ciphertext:
            return ""

        try:
            decrypted = self.cipher.decrypt(ciphertext.encode())
            return decrypted.decode()
        except Exception as e:
            # 如果解密失败，可能是未加密的旧数据
            # 返回原文（向后兼容）
            return ciphertext

    def is_encrypted(self, text: str) -> bool:
        """
        检查字符串是否已加密

        参数:
            text: 待检查的字符串

        返回:
            True if 已加密, False if 未加密
        """
        if not text:
            return False

        try:
            self.cipher.decrypt(text.encode())
            return True
        except:
            return False


# 全局加密管理器实例
_crypto_manager = None

def get_crypto_manager() -> CryptoManager:
    """获取加密管理器单例"""
    global _crypto_manager
    if _crypto_manager is None:
        _crypto_manager = CryptoManager()
    return _crypto_manager


def encrypt_api_key(api_key: str) -> str:
    """
    加密 API 密钥

    参数:
        api_key: API 密钥明文

    返回:
        加密后的密钥
    """
    manager = get_crypto_manager()
    return manager.encrypt(api_key)


def decrypt_api_key(encrypted_key: str) -> str:
    """
    解密 API 密钥

    参数:
        encrypted_key: 加密的密钥

    返回:
        解密后的密钥
    """
    manager = get_crypto_manager()
    return manager.decrypt(encrypted_key)


# 测试代码
if __name__ == '__main__':
    # 测试加密/解密
    manager = CryptoManager()

    test_key = "sk-test1234567890abcdefghijklmnopqrstuvwxyz"
    print(f"原始密钥: {test_key}")

    encrypted = manager.encrypt(test_key)
    print(f"加密后: {encrypted}")

    decrypted = manager.decrypt(encrypted)
    print(f"解密后: {decrypted}")

    assert decrypted == test_key, "加密/解密测试失败！"
    print("✅ 加密/解密测试通过！")
