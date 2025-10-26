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
        # 优先从环境变量获取
        api_key = os.getenv("OPENAI_API_KEY")
        
        # 如果环境变量没有，尝试从数据库配置获取
        if not api_key:
            try:
                from database import get_db
                from crud import get_config
                from crypto_utils import decrypt_api_key
                db = next(get_db())
                config = get_config(db, "openai_api_key")
                if config and config.value:
                    # 解密 API 密钥
                    api_key = decrypt_api_key(config.value)
            except Exception as e:
                logger.warning(f"从数据库获取OpenAI API Key失败: {e}")
    
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
            # 细化异常处理
            error_msg = str(e)
            should_retry = True

            # 根据错误类型判断是否应该重试
            if "authentication" in error_msg.lower() or "invalid api key" in error_msg.lower():
                logger.error(f"OpenAI API 密钥认证失败: {e}")
                raise Exception("OpenAI API 密钥无效或已过期，请检查配置")

            elif "rate_limit" in error_msg.lower() or "quota" in error_msg.lower():
                logger.warning(f"OpenAI API 请求频率限制或配额不足: {e}")
                # 速率限制可以重试
                if attempt == max_retries - 1:
                    raise Exception("OpenAI API 请求过于频繁或配额已用完，请稍后重试")

            elif "timeout" in error_msg.lower():
                logger.warning(f"OpenAI API 请求超时: {e}")
                if attempt == max_retries - 1:
                    raise Exception("OpenAI API 请求超时，请检查网络连接")

            elif "model" in error_msg.lower() and "not found" in error_msg.lower():
                logger.error(f"OpenAI 模型不存在: {e}")
                raise Exception(f"指定的 AI 模型 '{model}' 不存在或无权访问")

            elif "content_filter" in error_msg.lower() or "policy" in error_msg.lower():
                logger.error(f"OpenAI 内容策略违规: {e}")
                raise Exception("内容不符合 OpenAI 使用策略，请修改后重试")

            else:
                logger.warning(f"OpenAI 调用失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise Exception(f"OpenAI API 调用失败: {error_msg}")

            # 指数退避重试
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
        # 优先从环境变量获取
        api_key = os.getenv("DEEPSEEK_API_KEY")
        
        # 如果环境变量没有，尝试从数据库配置获取
        if not api_key:
            try:
                from database import get_db
                from crud import get_config
                db = next(get_db())
                config = get_config(db, "deepseek_api_key")
                if config and config.value:
                    api_key = config.value
            except Exception as e:
                logger.warning(f"从数据库获取DeepSeek API Key失败: {e}")
    
    if not api_key:
        logger.error("未配置 DeepSeek API Key")
        raise Exception("未配置 DeepSeek API Key，请在设置中配置或设置环境变量 DEEPSEEK_API_KEY")
    
    logger.info(f"使用 DeepSeek API: model={model}")
    
    # 创建客户端，指向 SiliconFlow 代理的 DeepSeek API
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.siliconflow.cn/v1"
    )
    
    # 组合完整的提示
    full_prompt = f"{prompt}\n\n以下是需要提炼的内容：\n\n{content}"
    
    # 重试机制
    max_retries = 5  # 增加重试次数
    for attempt in range(max_retries):
        try:
            logger.info(f"调用 DeepSeek API (尝试 {attempt + 1}/{max_retries})")
            
            # 调用 API (使用SiliconFlow的模型名称)
            model_name = "deepseek-ai/DeepSeek-V3" if model == "deepseek-chat" else model
            response = client.chat.completions.create(
                model=model_name,
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
                max_tokens=4000,  # 增加输出长度限制
                timeout=120.0  # 增加到120秒超时
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
            # 细化异常处理
            error_msg = str(e)

            # 根据错误类型判断是否应该重试
            if "authentication" in error_msg.lower() or "invalid api key" in error_msg.lower() or "401" in error_msg:
                logger.error(f"DeepSeek API 密钥认证失败: {e}")
                raise Exception("DeepSeek API 密钥无效或已过期，请检查配置")

            elif "rate_limit" in error_msg.lower() or "429" in error_msg or "quota" in error_msg.lower():
                logger.warning(f"DeepSeek API 请求频率限制或配额不足: {e}")
                if attempt == max_retries - 1:
                    raise Exception("DeepSeek API 请求过于频繁或配额已用完，请稍后重试")

            elif "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                logger.warning(f"DeepSeek API 请求超时: {e}")
                if attempt == max_retries - 1:
                    raise Exception("DeepSeek API 请求超时，请检查网络连接或稍后重试")

            elif ("model" in error_msg.lower() and "not found" in error_msg.lower()) or "404" in error_msg:
                logger.error(f"DeepSeek 模型不存在: {e}")
                raise Exception(f"指定的 AI 模型 '{model}' 不存在或无权访问")

            elif "content_filter" in error_msg.lower() or "policy" in error_msg.lower():
                logger.error(f"DeepSeek 内容策略违规: {e}")
                raise Exception("内容不符合 DeepSeek 使用策略，请修改后重试")

            elif "connection" in error_msg.lower() or "network" in error_msg.lower():
                logger.warning(f"DeepSeek API 网络连接错误: {e}")
                if attempt == max_retries - 1:
                    raise Exception("无法连接到 DeepSeek API 服务器，请检查网络")

            else:
                logger.warning(f"DeepSeek 调用失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise Exception(f"DeepSeek API 调用失败: {error_msg}")
            
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
            "name": "提炼标题",
            "content": "根据以下内容，生成 5 个吸引人的短视频标题，要求：\n1. 15 字以内\n2. 有悬念或价值点\n3. 符合平台风格（抖音/快手）\n4. 避免标题党",
            "description": "生成吸引人的标题",
            "is_default": False
        }
    ]

async def discover_topic_ideas(content: str, custom_prompt: str = None) -> list:
    """
    发现选题灵感 - 分析素材内容并推荐选题
    """
    logger.info("开始分析素材内容，发现选题灵感")
    
    try:
        # 构建选题发现的提示词
        if custom_prompt:
            prompt = custom_prompt
            logger.info("使用自定义选题提示词")
        else:
            prompt = """你是一个专业的短视频内容策划师，擅长从长文本中提取有价值的短视频选题。

请仔细分析以下素材内容，发现3-5个最有价值的短视频选题方向。

分析要求：
1. 选题必须基于素材中的具体内容，不能凭空创造
2. 每个选题都要有明确的实用价值或启发意义
3. 选题要适合制作1-3分钟的短视频
4. 目标受众要具体明确，不能过于宽泛
5. 传播潜力要基于内容的独特性和实用性

请严格按照以下JSON格式返回结果，不要添加任何其他文字：
[
  {
    "title": "具体而吸引人的选题标题",
    "core_idea": "基于素材内容的核心观点，50-100字",
    "target_audience": "具体的目标受众群体",
    "potential": "高/中/低 - 传播潜力评估"
  }
]"""
            logger.info("使用默认选题提示词")

        # 获取默认AI模型
        try:
            from database import get_db
            from crud import get_config
            db = next(get_db())
            default_model = get_config(db, "default_ai_model")
            model = default_model.value if default_model and default_model.value else "deepseek-chat"
        except Exception as e:
            logger.warning(f"获取默认AI模型失败: {e}")
            model = "deepseek-chat"
        
        # 调用AI分析
        result = refine_content(content, prompt, model)
        
        if result and 'refined_text' in result:
            # 尝试解析JSON结果
            import json
            import re
            
            raw_text = result['refined_text']
            logger.info(f"AI原始返回: {raw_text[:200]}...")
            
            # 尝试提取JSON内容（处理Markdown代码块）
            json_text = raw_text
            
            # 如果被```json```包裹，提取其中的内容
            if '```json' in raw_text:
                match = re.search(r'```json\s*(.*?)\s*```', raw_text, re.DOTALL)
                if match:
                    json_text = match.group(1).strip()
                    logger.info("从Markdown代码块中提取JSON")
            elif '```' in raw_text:
                # 处理普通的```代码块
                match = re.search(r'```\s*(.*?)\s*```', raw_text, re.DOTALL)
                if match:
                    json_text = match.group(1).strip()
                    logger.info("从代码块中提取内容")
            
            try:
                topic_ideas = json.loads(json_text)
                logger.info(f"成功发现 {len(topic_ideas)} 个选题灵感")
                return topic_ideas
            except json.JSONDecodeError as e:
                logger.warning(f"JSON解析失败: {e}")
                logger.warning(f"尝试解析的内容: {json_text[:200]}...")
                
                # 如果JSON解析失败，返回文本格式
                return [{
                    "title": "AI分析结果",
                    "core_idea": raw_text,
                    "target_audience": "通用受众",
                    "potential": "待评估"
                }]
        else:
            logger.error("AI分析失败，返回空结果")
            return []
            
    except Exception as e:
        logger.error(f"发现选题灵感失败: {e}", exc_info=True)
        return []

