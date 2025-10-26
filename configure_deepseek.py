#!/usr/bin/env python3
"""
DeepSeek API 配置脚本
演示如何配置 DeepSeek API Key
"""

import requests
import json

# 配置信息
API_BASE_URL = "http://localhost:8000/api"
DEEPSEEK_API_KEY = "sk-your-deepseek-api-key-here"  # 请替换为您的实际API Key

def configure_deepseek():
    """配置 DeepSeek API"""
    print("🚀 开始配置 DeepSeek API...")
    
    # 1. 获取当前配置
    print("\n📋 获取当前配置...")
    response = requests.get(f"{API_BASE_URL}/configs")
    if response.status_code == 200:
        configs = response.json()["data"]
        print(f"当前AI模型: {configs.get('default_ai_model', '未设置')}")
        print(f"DeepSeek API Key: {'已配置' if configs.get('deepseek_api_key') else '未配置'}")
    else:
        print("❌ 获取配置失败")
        return
    
    # 2. 更新配置
    print(f"\n🔧 配置 DeepSeek API Key...")
    update_data = {
        "deepseek_api_key": DEEPSEEK_API_KEY,
        "default_ai_model": "deepseek-chat"
    }
    
    response = requests.put(f"{API_BASE_URL}/configs", json=update_data)
    if response.status_code == 200:
        print("✅ DeepSeek API 配置成功！")
        print(f"   - API Key: {DEEPSEEK_API_KEY[:10]}...")
        print(f"   - 默认模型: deepseek-chat")
    else:
        print(f"❌ 配置失败: {response.text}")
        return
    
    # 3. 验证配置
    print("\n🔍 验证配置...")
    response = requests.get(f"{API_BASE_URL}/configs")
    if response.status_code == 200:
        configs = response.json()["data"]
        print(f"✅ 配置验证成功！")
        print(f"   - 当前AI模型: {configs.get('default_ai_model')}")
        print(f"   - DeepSeek API Key: {'已配置' if configs.get('deepseek_api_key') else '未配置'}")
    
    print("\n🎉 DeepSeek API 配置完成！")
    print("\n📝 使用说明:")
    print("1. 访问 http://localhost:3001/settings 查看配置")
    print("2. 在素材库中使用 AI 提炼功能")
    print("3. 使用发现选题灵感功能")
    print("\n💰 DeepSeek 价格优势:")
    print("- 输入: $0.14/1M tokens")
    print("- 输出: $0.28/1M tokens")
    print("- 比 GPT-4 便宜 50 倍！")

if __name__ == "__main__":
    print("=" * 60)
    print("🤖 ContentHub DeepSeek API 配置工具")
    print("=" * 60)
    
    # 检查API Key
    if DEEPSEEK_API_KEY == "sk-your-deepseek-api-key-here":
        print("\n⚠️  请先设置您的 DeepSeek API Key!")
        print("1. 访问 https://platform.deepseek.com/api_keys")
        print("2. 创建新的 API Key")
        print("3. 修改脚本中的 DEEPSEEK_API_KEY 变量")
        print("4. 重新运行此脚本")
    else:
        configure_deepseek()
