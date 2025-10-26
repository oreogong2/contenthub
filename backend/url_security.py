"""
URL 安全验证模块

防止 SSRF (Server-Side Request Forgery) 攻击
包含域名白名单、私有 IP 地址过滤等安全功能
"""

import os
import re
import socket
import ipaddress
import logging
from urllib.parse import urlparse
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# 允许的图片域名白名单（支持环境变量配置）
DEFAULT_ALLOWED_DOMAINS = {
    # 社交媒体平台
    'pbs.twimg.com',  # Twitter/X
    'abs.twimg.com',  # Twitter/X
    'xhscdn.com',  # 小红书
    'ci.xiaohongshu.com',  # 小红书
    'sns-webpic-qc.xhscdn.com',  # 小红书
    'sinaimg.cn',  # 微博
    'ws1.sinaimg.cn',  # 微博
    'ws2.sinaimg.cn',  # 微博
    'ws3.sinaimg.cn',  # 微博
    'ws4.sinaimg.cn',  # 微博
    'p16-sign.tiktokcdn.com',  # TikTok
    'p16.tiktokcdn.com',  # TikTok
    'p9-sign.douyinpic.com',  # 抖音

    # CDN 和图片服务
    'imgur.com',
    'i.imgur.com',
    'cloudinary.com',
    'unsplash.com',
    'images.unsplash.com',
    'pexels.com',
    'images.pexels.com',

    # 常见云存储
    'amazonaws.com',  # AWS S3
    'cloudfront.net',  # AWS CloudFront
    'googleusercontent.com',  # Google Cloud
    'azureedge.net',  # Azure CDN

    # 其他
    'githubusercontent.com',  # GitHub
}

# 私有 IP 地址范围
PRIVATE_IP_RANGES = [
    ipaddress.ip_network('10.0.0.0/8'),      # RFC 1918
    ipaddress.ip_network('172.16.0.0/12'),   # RFC 1918
    ipaddress.ip_network('192.168.0.0/16'),  # RFC 1918
    ipaddress.ip_network('127.0.0.0/8'),     # Loopback
    ipaddress.ip_network('169.254.0.0/16'),  # Link-local
    ipaddress.ip_network('::1/128'),         # IPv6 loopback
    ipaddress.ip_network('fc00::/7'),        # IPv6 private
    ipaddress.ip_network('fe80::/10'),       # IPv6 link-local
]


class URLSecurityError(Exception):
    """URL 安全验证异常"""
    pass


def load_allowed_domains() -> set:
    """
    从环境变量加载允许的域名白名单

    Returns:
        set: 允许的域名集合
    """
    # 从环境变量读取额外的白名单域名
    env_domains = os.getenv('ALLOWED_IMAGE_DOMAINS', '')

    allowed = DEFAULT_ALLOWED_DOMAINS.copy()

    if env_domains:
        # 支持逗号分隔的域名列表
        extra_domains = [d.strip() for d in env_domains.split(',') if d.strip()]
        allowed.update(extra_domains)
        logger.info(f"从环境变量加载了 {len(extra_domains)} 个额外域名")

    return allowed


def is_private_ip(ip_str: str) -> bool:
    """
    检查 IP 地址是否为私有地址

    Args:
        ip_str: IP 地址字符串

    Returns:
        bool: 是否为私有 IP
    """
    try:
        ip = ipaddress.ip_address(ip_str)

        # 检查是否在私有 IP 范围内
        for private_range in PRIVATE_IP_RANGES:
            if ip in private_range:
                return True

        return False

    except ValueError:
        # 无效的 IP 地址
        return False


def resolve_hostname(hostname: str) -> Optional[str]:
    """
    解析域名为 IP 地址

    Args:
        hostname: 域名

    Returns:
        Optional[str]: IP 地址，如果解析失败返回 None
    """
    try:
        ip = socket.gethostbyname(hostname)
        logger.debug(f"域名解析: {hostname} -> {ip}")
        return ip
    except socket.gaierror as e:
        logger.warning(f"域名解析失败: {hostname}, {e}")
        return None


def validate_url_format(url: str) -> Tuple[bool, str]:
    """
    验证 URL 格式

    Args:
        url: URL 字符串

    Returns:
        Tuple[bool, str]: (是否有效, 错误信息)
    """
    if not url or not url.strip():
        return False, "URL 不能为空"

    # 检查 URL 长度
    if len(url) > 2048:
        return False, "URL 过长"

    # 解析 URL
    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, f"URL 格式无效: {e}"

    # 检查协议
    if parsed.scheme not in ['http', 'https']:
        return False, f"不支持的协议: {parsed.scheme}，仅支持 http/https"

    # 检查主机名
    if not parsed.netloc:
        return False, "URL 缺少主机名"

    # 检查是否包含用户名密码（可能的 SSRF 攻击）
    if '@' in parsed.netloc:
        return False, "URL 不能包含用户名密码"

    return True, ""


def is_domain_allowed(hostname: str, allowed_domains: set) -> bool:
    """
    检查域名是否在白名单中

    支持完全匹配和后缀匹配（如 *.example.com）

    Args:
        hostname: 域名
        allowed_domains: 允许的域名集合

    Returns:
        bool: 是否允许
    """
    hostname = hostname.lower()

    # 完全匹配
    if hostname in allowed_domains:
        return True

    # 后缀匹配（支持子域名）
    for allowed_domain in allowed_domains:
        # 检查是否为子域名
        if hostname.endswith('.' + allowed_domain):
            return True

    return False


def validate_image_url(url: str, check_dns: bool = True) -> Tuple[bool, Optional[str]]:
    """
    完整的图片 URL 安全验证

    Args:
        url: 图片 URL
        check_dns: 是否检查 DNS 解析（防止 SSRF）

    Returns:
        Tuple[bool, Optional[str]]: (是否有效, 错误信息)

    Raises:
        URLSecurityError: 验证失败
    """
    logger.info(f"开始验证图片 URL: {url}")

    # 1. 验证 URL 格式
    is_valid, error_msg = validate_url_format(url)
    if not is_valid:
        raise URLSecurityError(f"URL 格式验证失败: {error_msg}")

    # 2. 解析 URL
    parsed = urlparse(url)
    hostname = parsed.netloc.lower()

    # 移除端口号
    if ':' in hostname:
        hostname = hostname.split(':')[0]

    # 3. 检查域名白名单（开发模式下可禁用）
    dev_mode = os.getenv('DEV_MODE', 'false').lower() == 'true'

    if not dev_mode:
        allowed_domains = load_allowed_domains()

        if not is_domain_allowed(hostname, allowed_domains):
            raise URLSecurityError(
                f"域名 {hostname} 不在白名单中。"
                f"如需添加，请设置环境变量 ALLOWED_IMAGE_DOMAINS"
            )

        logger.info(f"域名白名单验证通过: {hostname}")
    else:
        logger.warning(f"⚠️  开发模式：跳过域名白名单检查 ({hostname})")

    # 4. DNS 解析检查（防止 SSRF 攻击）
    if check_dns:
        # 检查是否直接使用 IP 地址
        try:
            ip = ipaddress.ip_address(hostname)
            # 如果是 IP 地址，检查是否为私有 IP
            if is_private_ip(str(ip)):
                raise URLSecurityError(
                    f"禁止访问私有 IP 地址: {ip}"
                )
        except ValueError:
            # 不是 IP 地址，继续 DNS 解析
            resolved_ip = resolve_hostname(hostname)

            if not resolved_ip:
                raise URLSecurityError(f"无法解析域名: {hostname}")

            # 检查解析后的 IP 是否为私有地址
            if is_private_ip(resolved_ip):
                raise URLSecurityError(
                    f"域名 {hostname} 解析到私有 IP: {resolved_ip}，可能是 SSRF 攻击"
                )

            logger.info(f"DNS 解析验证通过: {hostname} -> {resolved_ip}")

    logger.info(f"URL 安全验证通过: {url}")
    return True, None


def sanitize_url(url: str) -> str:
    """
    净化 URL，移除潜在的恶意部分

    Args:
        url: 原始 URL

    Returns:
        str: 净化后的 URL
    """
    # 移除空白字符
    url = url.strip()

    # 移除 URL 编码的换行符和其他控制字符
    url = re.sub(r'%0[dDaA]', '', url)
    url = re.sub(r'%00', '', url)

    return url
