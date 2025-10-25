"""
文件名: ai_service.py
作用: AI 调用服务（OpenAI/Claude）
作者: ContentHub Team
日期: 2025-10-25
最后更新: 2025-10-25
"""

import logging
import os
import time

logger = logging.getLogger(__name__)

def refine_content(content: str, prompt: str, model: str = "gpt-4", api_key: str = None):
    """
    使用 AI 提炼内容
    
    这个函数会调用 OpenAI 或 Claude API，根据给定的提示词对内容进行提炼。
    支持自动重试机制，最多重试 3 次。
    
    参数:
        content (str): 需要提炼的原始内容
        prompt (str): 提示词模板
        model (str): AI 模型名称，默认 gpt-4
        api_key (str): API Key，如果不提供则从环境变量读取
    
    返回:
        dict: {
            'refined_text': str,  # 提炼后的内容
            'model_used': str,    # 使用的模型
            'tokens_used': int,   # 使用的token数
            'cost_usd': float     # 预估费用（美元）
        }
    
    异常:
        ValueError: 当 content 为空时
        Exception: 当 AI API 调用失败时
    """
    logger.info(f"AI 提炼开始: model={model}, content_length={len(content)}, prompt_length={len(prompt)}")
    
    # 1. 验证输入
    if not content or not content.strip():
        logger.error("内容为空")
        raise ValueError("内容不能为空")
    
    if not prompt or not prompt.strip():
        logger.error("提示词为空")
        raise ValueError("提示词不能为空")
    
    # 2. 根据模型选择调用函数
    if model.startswith("gpt"):
        return _call_openai(content, prompt, model, api_key)
    elif model.startswith("claude"):
        return _call_claude(content, prompt, model, api_key)
    elif model.startswith("deepseek"):
        return _call_deepseek(content, prompt, model, api_key)
    else:
        logger.error(f"不支持的模型: {model}")
        raise ValueError(f"不支持的模型: {model}")

def _call_openai(content: str, prompt: str, model: str, api_key: str = None):
    """
    调用 OpenAI API
    
    支持的模型：
    - gpt-4
    - gpt-3.5-turbo
    """
    try:
        from openai import OpenAI
    except ImportError:
        logger.error("OpenAI SDK 未安装")
        raise Exception("OpenAI SDK 未安装，请运行: pip install openai")
    
    # 获取 API Key
    if not api_key:
        api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        logger.error("未配置 OpenAI API Key")
        raise Exception("未配置 OpenAI API Key，请在设置中配置或设置环境变量 OPENAI_API_KEY")
    
    logger.info(f"使用 OpenAI API: model={model}")
    
    # 创建客户端
    client = OpenAI(api_key=api_key)
    
    # 组合完整的提示
    full_prompt = f"{prompt}\n\n以下是需要提炼的内容：\n\n{content}"
    
    # 重试机制
    max_retries = 3
    for attempt in range(max_retries):
        try:
            logger.info(f"调用 OpenAI API (尝试 {attempt + 1}/{max_retries})")
            
            # 调用 API
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个专业的内容提炼助手，擅长从长文本中提取关键信息，帮助短视频创作者快速获取选题灵感。"
                    },
                    {
                        "role": "user",
                        "content": full_prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000,
                timeout=30.0  # 30秒超时
            )
            
            # 提取结果
            refined_text = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            # 估算费用（粗略估算）
            # GPT-4: $0.03/1K tokens (input) + $0.06/1K tokens (output)
            # GPT-3.5-turbo: $0.001/1K tokens
            if model == "gpt-4":
                cost_usd = (tokens_used / 1000) * 0.045  # 平均值
            elif model == "gpt-3.5-turbo":
                cost_usd = (tokens_used / 1000) * 0.001
            else:
                cost_usd = 0.0
            
            logger.info(f"OpenAI 调用成功: tokens={tokens_used}, cost=${cost_usd:.4f}")
            
            return {
                'refined_text': refined_text,
                'model_used': model,
                'tokens_used': tokens_used,
                'cost_usd': round(cost_usd, 4)
            }
            
        except Exception as e:
            logger.warning(f"OpenAI 调用失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            
            if attempt == max_retries - 1:
                # 最后一次尝试失败
                logger.error(f"OpenAI 调用最终失败: {e}")
                raise Exception(f"AI 调用失败: {str(e)}")
            
            # 指数退避
            sleep_time = 2 ** attempt
            logger.info(f"等待 {sleep_time} 秒后重试...")
            time.sleep(sleep_time)

def _call_claude(content: str, prompt: str, model: str, api_key: str = None):
    """
    调用 Claude API
    
    支持的模型：
    - claude-3-sonnet
    - claude-3-opus
    """
    # 获取 API Key
    if not api_key:
        api_key = os.getenv("CLAUDE_API_KEY")
    
    if not api_key:
        logger.error("未配置 Claude API Key")
        raise Exception("未配置 Claude API Key，请在设置中配置或设置环境变量 CLAUDE_API_KEY")
    
    logger.info(f"使用 Claude API: model={model}")
    
    # TODO: 实现 Claude API 调用
    # 这里暂时返回提示，因为 Claude SDK 的具体实现可能不同
    logger.warning("Claude API 暂未实现，请使用 OpenAI")
    raise Exception("Claude API 暂未实现，请使用 OpenAI 模型")

def _call_deepseek(content: str, prompt: str, model: str, api_key: str = None):
    """
    调用 DeepSeek API
    
    DeepSeek API 兼容 OpenAI 格式，价格便宜
    支持的模型：
    - deepseek-chat
    """
    try:
        from openai import OpenAI
    except ImportError:
        logger.error("OpenAI SDK 未安装")
        raise Exception("OpenAI SDK 未安装，请运行: pip install openai")
    
    # 获取 API Key
    if not api_key:
        api_key = os.getenv("DEEPSEEK_API_KEY")
    
    if not api_key:
        logger.error("未配置 DeepSeek API Key")
        raise Exception("未配置 DeepSeek API Key，请在设置中配置或设置环境变量 DEEPSEEK_API_KEY")
    
    logger.info(f"使用 DeepSeek API: model={model}")
    
    # 创建客户端，指向 DeepSeek API
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )
    
    # 组合完整的提示
    full_prompt = f"{prompt}\n\n以下是需要提炼的内容：\n\n{content}"
    
    # 重试机制
    max_retries = 3
    for attempt in range(max_retries):
        try:
            logger.info(f"调用 DeepSeek API (尝试 {attempt + 1}/{max_retries})")
            
            # 调用 API
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个专业的内容提炼助手，擅长从长文本中提取关键信息，帮助短视频创作者快速获取选题灵感。"
                    },
                    {
                        "role": "user",
                        "content": full_prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000,
                timeout=30.0  # 30秒超时
            )
            
            # 提取结果
            refined_text = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            # 估算费用
            # DeepSeek: $0.14/1M tokens (input) + $0.28/1M tokens (output)
            # 为了简化，使用平均值 $0.21/1M tokens
            cost_usd = (tokens_used / 1_000_000) * 0.21
            
            logger.info(f"DeepSeek 调用成功: tokens={tokens_used}, cost=${cost_usd:.4f}")
            
            return {
                'refined_text': refined_text,
                'model_used': model,
                'tokens_used': tokens_used,
                'cost_usd': round(cost_usd, 4)
            }
            
        except Exception as e:
            logger.warning(f"DeepSeek 调用失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            
            if attempt == max_retries - 1:
                # 最后一次尝试失败
                logger.error(f"DeepSeek 调用最终失败: {e}")
                raise Exception(f"AI 调用失败: {str(e)}")
            
            # 指数退避
            sleep_time = 2 ** attempt
            logger.info(f"等待 {sleep_time} 秒后重试...")
            time.sleep(sleep_time)

def get_default_prompts():
    """
    获取默认提示词列表
    
    返回:
        list: 提示词列表
    """
    return [
        {
            "id": 1,
            "name": "提取核心观点",
            "content": "请从以下内容中提取 3-5 个核心观点，每个观点用一句话概括，突出重点和价值。要求简洁明了，便于理解。",
            "description": "适合快速了解重点",
            "is_default": True
        },
        {
            "id": 2,
            "name": "生成短视频脚本",
            "content": "将以下内容改写成 60 秒短视频口播稿，要求：\n1. 【开头】(0-10秒) 用一个吸引人的钩子抓住观众注意力\n2. 【正文】(10-50秒) 讲清楚核心内容，使用口语化表达\n3. 【结尾】(50-60秒) 给出明确的行动号召",
            "description": "包含钩子、正文、行动号召",
            "is_default": False
        },
        {
            "id": 3,
            "name": "可拍摄角度",
            "content": "分析以下内容，给出 3 个可以拍摄的短视频角度，每个角度包括：\n1. 选题方向（一句话标题）\n2. 核心内容（要讲什么）\n3. 预期效果（为什么观众会感兴趣）",
            "description": "分析多个拍摄角度",
            "is_default": False
        },
        {
            "id": 4,
            "name": "提炼标题",
            "content": "根据以下内容，生成 5 个吸引人的短视频标题，要求：\n1. 15 字以内\n2. 有悬念或价值点\n3. 符合平台风格（抖音/快手）\n4. 避免标题党",
            "description": "生成吸引人的标题",
            "is_default": False
        }
    ]

