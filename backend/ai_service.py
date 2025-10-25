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

def generate_topic_inspirations(materials: list, count: int = 5, model: str = "gpt-4", api_key: str = None):
    """
    基于多个素材生成选题灵感

    这个函数会分析多个素材，找出：
    - 共同主题和趋势
    - 可组合的内容
    - 不同视角和观点

    然后生成多个选题建议，每个建议包含：
    - 选题标题
    - 相关素材
    - 推荐理由
    - 建议角度

    参数:
        materials (list): 素材列表，每个素材是一个字典：
            {
                'id': int,
                'title': str,
                'content': str,
                'source_type': str
            }
        count (int): 生成几个建议，默认 5 个
        model (str): AI 模型名称，默认 gpt-4
        api_key (str): API Key，如果不提供则从环境变量读取

    返回:
        dict: {
            'inspirations': [
                {
                    'title': str,  # 选题标题
                    'description': str,  # 选题描述
                    'related_material_ids': [int],  # 相关素材 ID
                    'tags': [str],  # 标签
                    'reasoning': str,  # 推荐理由
                    'suggested_angle': str,  # 建议角度（教程/对比/案例等）
                    'difficulty': str,  # 难度（简单/中等/困难）
                    'estimated_duration': str  # 预估时长
                }
            ],
            'model_used': str,
            'tokens_used': int,
            'cost_usd': float
        }

    异常:
        ValueError: 当 materials 为空时
        Exception: 当 AI 调用失败时
    """
    logger.info(f"生成选题灵感: materials_count={len(materials)}, count={count}")

    # 1. 验证输入
    if not materials or len(materials) == 0:
        raise ValueError("素材列表不能为空")

    if len(materials) > 20:
        logger.warning(f"素材数量过多 ({len(materials)})，将只使用前 20 个")
        materials = materials[:20]

    # 2. 准备素材内容
    materials_summary = []
    for i, mat in enumerate(materials, 1):
        # 限制每个素材的内容长度，避免超出 token 限制
        content_preview = mat['content'][:500] if len(mat['content']) > 500 else mat['content']
        materials_summary.append(
            f"【素材 {i}】ID={mat['id']}, 来源={mat.get('source_type', '未知')}\n"
            f"标题：{mat.get('title', '无标题')}\n"
            f"内容：{content_preview}\n"
        )

    materials_text = "\n".join(materials_summary)

    # 3. 构建提示词
    prompt = f"""你是一个专业的短视频选题策划师。请分析以下 {len(materials)} 个素材，为创作者推荐 {count} 个高质量的选题灵感。

## 素材列表
{materials_text}

## 任务要求
请深度分析这些素材，找出：
1. 共同主题和趋势
2. 可以组合创新的素材
3. 不同的观点和角度
4. 有价值的信息点

## 输出格式（必须严格遵守 JSON 格式）
请以 JSON 数组的形式返回 {count} 个选题建议，每个建议包含以下字段：

```json
[
  {{
    "title": "选题标题（15字以内，吸引人）",
    "description": "选题描述（50字左右，说明这个选题的核心内容和价值）",
    "related_material_ids": [1, 2],
    "tags": ["标签1", "标签2", "标签3"],
    "reasoning": "推荐理由（为什么推荐这个选题，基于哪些素材的什么特点）",
    "suggested_angle": "教程类/对比分析/案例拆解/观点输出/数据分析",
    "difficulty": "简单/中等/困难",
    "estimated_duration": "3-5分钟/5-8分钟/8-10分钟"
  }}
]
```

## 注意事项
1. 选题要有创意和价值，不要简单重复素材内容
2. 优先推荐能组合多个素材的选题（1+1>2）
3. related_material_ids 必须是上面素材列表中的真实 ID
4. 标签要精准，最多 3-5 个
5. 建议角度要具体可执行
6. 只返回 JSON 数组，不要有其他文字"""

    # 4. 调用 AI
    try:
        result = refine_content("请生成选题灵感", prompt, model, api_key)

        # 5. 解析 JSON 响应
        import json
        import re

        # 尝试提取 JSON
        response_text = result['refined_text']

        # 查找 JSON 数组（支持 markdown 代码块）
        json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', response_text, re.DOTALL)
        if json_match:
            json_text = json_match.group(1)
        else:
            # 尝试直接查找 JSON 数组
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group(0)
            else:
                logger.error("无法从响应中提取 JSON")
                raise Exception("AI 返回格式错误，无法解析 JSON")

        # 解析 JSON
        try:
            inspirations = json.loads(json_text)
            logger.info(f"成功生成 {len(inspirations)} 个选题灵感")
        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {e}")
            logger.error(f"原始响应: {response_text}")
            raise Exception(f"AI 返回的 JSON 格式错误: {e}")

        return {
            'inspirations': inspirations,
            'model_used': result['model_used'],
            'tokens_used': result['tokens_used'],
            'cost_usd': result['cost_usd']
        }

    except Exception as e:
        logger.error(f"生成选题灵感失败: {e}", exc_info=True)
        raise


def batch_refine_materials(materials: list, prompt: str, mode: str = "synthesize",
                          model: str = "gpt-4", api_key: str = None):
    """
    批量提炼多个素材

    支持三种模式：
    1. combine（整合模式）：将素材整合成一个选题，保留关键信息
    2. compare（对比模式）：对比素材的观点，找出异同点
    3. synthesize（综合模式）：深度分析，提取共同主题，生成新观点

    参数:
        materials (list): 素材列表，每个素材包含 id, title, content
        prompt (str): 用户自定义的提示词
        mode (str): 提炼模式（combine/compare/synthesize）
        model (str): AI 模型名称
        api_key (str): API Key

    返回:
        dict: {
            'refined_text': str,  # 提炼后的内容
            'materials_count': int,  # 使用的素材数量
            'mode': str,  # 使用的模式
            'model_used': str,
            'tokens_used': int,
            'cost_usd': float
        }

    异常:
        ValueError: 当参数错误时
        Exception: 当 AI 调用失败时
    """
    logger.info(f"批量提炼素材: materials_count={len(materials)}, mode={mode}")

    # 1. 验证输入
    if not materials or len(materials) < 2:
        raise ValueError("至少需要 2 个素材进行批量提炼")

    if len(materials) > 5:
        logger.warning(f"素材数量过多 ({len(materials)})，将只使用前 5 个")
        materials = materials[:5]

    if mode not in ['combine', 'compare', 'synthesize']:
        raise ValueError(f"不支持的模式: {mode}，请使用 combine/compare/synthesize")

    # 2. 准备素材内容
    materials_text = []
    for i, mat in enumerate(materials, 1):
        materials_text.append(
            f"【素材 {i}】\n"
            f"标题：{mat.get('title', '无标题')}\n"
            f"来源：{mat.get('source_type', '未知')}\n"
            f"内容：\n{mat['content']}\n"
            f"{'='*50}\n"
        )

    combined_materials = "\n".join(materials_text)

    # 3. 根据模式构建系统提示
    mode_prompts = {
        'combine': """你是一个专业的内容整合师。请将以下多个素材整合成一个连贯的选题内容。

要求：
1. 保留所有素材的关键信息
2. 去除重复内容
3. 按照逻辑顺序组织
4. 使内容连贯流畅
5. 突出重点和亮点""",

        'compare': """你是一个专业的内容分析师。请对比分析以下素材的观点和内容。

要求：
1. 找出所有素材的共同点
2. 找出不同观点和分歧
3. 分析差异产生的原因
4. 给出客观的对比分析
5. 可以用表格或列表形式展示""",

        'synthesize': """你是一个专业的内容策划师。请深度分析以下素材，提取共同主题，生成新的观点和选题。

要求：
1. 提取所有素材的共同主题
2. 分析不同素材的互补性
3. 发现素材之间的联系
4. 生成创新的观点和角度
5. 给出完整的选题建议"""
    }

    system_prompt = mode_prompts[mode]

    # 4. 组合完整提示
    full_prompt = f"""{system_prompt}

## 用户要求
{prompt}

## 素材内容
{combined_materials}

## 输出要求
请根据上述要求和素材内容，生成高质量的提炼结果。"""

    # 5. 调用 AI
    try:
        result = refine_content("批量提炼素材", full_prompt, model, api_key)

        return {
            'refined_text': result['refined_text'],
            'materials_count': len(materials),
            'mode': mode,
            'model_used': result['model_used'],
            'tokens_used': result['tokens_used'],
            'cost_usd': result['cost_usd']
        }

    except Exception as e:
        logger.error(f"批量提炼失败: {e}", exc_info=True)
        raise


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

