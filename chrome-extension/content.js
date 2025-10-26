// ContentHub Chrome插件 - Content Script
console.log('ContentHub插件已加载');

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    extractContent(request.useOCR)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('提取失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  }
});

// 提取页面内容
async function extractContent(useOCR = false) {
  const result = {
    url: window.location.href,
    platform: detectPlatform(),
    originalText: '',
    images: [],
    ocrResults: [],
    combinedText: ''
  };

  try {
    // 提取文本内容
    result.originalText = extractTextContent();
    
    // 提取图片
    result.images = extractImages();
    
    // 如果需要OCR
    if (useOCR && result.images.length > 0) {
      result.ocrResults = await performOCR(result.images);
    }
    
    // 合并所有文本
    const allTexts = [result.originalText];
    if (result.ocrResults) {
      allTexts.push(...result.ocrResults.map(r => r.text).filter(t => t));
    }
    result.combinedText = allTexts.filter(t => t).join('\n\n');
    
    console.log('提取结果:', result);
    return result;
  } catch (error) {
    console.error('提取失败:', error);
    throw error;
  }
}

// 检测平台
function detectPlatform() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('xiaohongshu.com')) return 'xiaohongshu';
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
  if (hostname.includes('weibo.com')) return 'weibo';
  if (hostname.includes('douyin.com')) return 'douyin';
  if (hostname.includes('localhost:3000') || hostname.includes('contenthub')) return 'contenthub';
  
  return 'other';
}

// 提取文本内容
function extractTextContent() {
  // 检测当前平台
  const platform = detectPlatform();

  // Twitter/X 特殊处理 - 确保提取原文而不是翻译
  if (platform === 'twitter') {
    return extractTwitterText();
  }

  const selectors = [
    // 小红书
    '.note-text',
    '.desc',
    '.content',
    '.text-content',
    '[data-testid="note-text"]',
    '.note-detail .desc',
    '.note-detail .content',

    // 推特（备选）
    '[data-testid="tweetText"]',
    '.tweet-text',
    '.js-tweet-text',
    '.tweet-content',

    // 微博
    '.weibo-text',
    '.WB_text',
    '.txt',
    '.content',

    // ContentHub
    '.ant-typography',
    '.ant-card-body',
    'main p',
    '.main-content',

    // 通用
    'main p',
    '.content',
    '.text',
    '.post-content',
    '.article-content',
    'p',
    'div[class*="content"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.trim()) {
      return element.innerText.trim();
    }
  }

  return '';
}

// 专门提取推特文本（确保提取原文）
function extractTwitterText() {
  try {
    // 方法1: 提取推文主体内容（排除翻译文本）
    const tweetText = document.querySelector('[data-testid="tweetText"]');
    if (tweetText) {
      // 获取所有文本节点，排除 [data-testid="translation"] 的翻译文本
      let text = '';

      // 遍历所有子元素
      const walkNode = (node) => {
        // 跳过翻译相关的元素
        if (node.nodeType === Node.ELEMENT_NODE) {
          // 跳过翻译提示和翻译文本
          if (node.getAttribute && (
              node.getAttribute('data-testid') === 'translation' ||
              node.getAttribute('data-testid') === 'translateLink' ||
              node.className?.includes?.('translate')
          )) {
            return;
          }
        }

        // 如果是文本节点，添加文本
        if (node.nodeType === Node.TEXT_NODE) {
          const nodeText = node.textContent.trim();
          if (nodeText) {
            text += nodeText + ' ';
          }
        }

        // 递归处理子节点
        if (node.childNodes) {
          node.childNodes.forEach(child => walkNode(child));
        }
      };

      walkNode(tweetText);
      text = text.trim();

      if (text) {
        console.log('✅ 提取推特原文:', text.substring(0, 100));
        return text;
      }
    }

    // 方法2: 备选方案 - 直接获取 innerText（可能包含翻译）
    if (tweetText && tweetText.innerText.trim()) {
      const fullText = tweetText.innerText.trim();
      // 尝试移除翻译文本（通常以"显示翻译"或"Translate"分隔）
      const textWithoutTranslation = fullText.split(/\n(Translate|Show translation|显示翻译|翻译)/)[0].trim();
      console.log('✅ 提取推特文本（移除翻译）:', textWithoutTranslation.substring(0, 100));
      return textWithoutTranslation;
    }

    // 方法3: 最后的备选方案
    const articleElement = document.querySelector('article');
    if (articleElement) {
      const spans = articleElement.querySelectorAll('span[class]');
      let text = '';
      spans.forEach(span => {
        if (span.innerText && span.innerText.trim() && !span.innerText.includes('Translate')) {
          text += span.innerText.trim() + ' ';
        }
      });
      if (text.trim()) {
        console.log('✅ 提取推特文本（方法3）:', text.trim().substring(0, 100));
        return text.trim();
      }
    }

    console.warn('⚠️ 无法提取推特文本，返回空字符串');
    return '';

  } catch (error) {
    console.error('提取推特文本失败:', error);
    return '';
  }
}

// 提取图片
function extractImages() {
  const selectors = [
    // 小红书 - 扩展选择器以匹配更多图片
    '.swiper-slide img',
    '.note-image img',
    '.image img',
    '.carousel img',
    '.swiper-wrapper img',
    '.note-scroller img',
    'img[class*="image"]',
    'img[class*="photo"]',

    // 推特 - 扩展选择器
    'img[src*="pbs.twimg.com"]',
    '.media img',
    '.tweet-image img',
    '[data-testid="tweetPhoto"] img',
    'article img',

    // 微博
    'img[src*="sinaimg.cn"]',
    '.media img',
    '.weibo-image img',
    '.WB_pic img',

    // ContentHub
    '.ant-image img',
    '.ant-avatar img',

    // 通用 - 提取所有有效图片
    'img[src*="http"]',
    '.image img',
    '.photo img',
    '.media img',
    'picture img',
    'figure img'
  ];

  const imageUrls = new Set(); // 使用Set去重
  const images = [];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(img => {
      // 获取实际显示的图片URL（可能在src或data-src中）
      let imageUrl = img.src || img.dataset.src || img.getAttribute('data-original');

      // 清理URL（移除尺寸参数，获取原图）
      if (imageUrl) {
        // 推特图片：移除尺寸参数，获取原图
        if (imageUrl.includes('pbs.twimg.com')) {
          imageUrl = imageUrl.replace(/(\?|\&)(name|format)=[^&]*/g, '');
          imageUrl = imageUrl.split('?')[0] + '?name=large'; // 获取大图
        }

        // 小红书图片：移除尺寸参数
        if (imageUrl.includes('xhscdn.com')) {
          imageUrl = imageUrl.split('?')[0];
        }
      }

      // 验证URL有效性
      if (imageUrl &&
          imageUrl.startsWith('http') &&
          !imageUrl.includes('data:') &&
          !imageUrl.includes('avatar') && // 排除头像
          !imageUrl.includes('icon') &&   // 排除图标
          img.width > 50 &&  // 排除太小的图片
          img.height > 50 &&
          !imageUrls.has(imageUrl)) { // 去重

        imageUrls.add(imageUrl);
        images.push({
          index: images.length + 1,
          url: imageUrl
        });
      }
    });
  }

  console.log(`✅ 提取到 ${images.length} 张图片`);
  return images;
}

// OCR识别（调用后端API）
async function performOCR(images) {
  try {
    console.log(`开始OCR识别 ${images.length} 张图片`);

    // 获取 ContentHub URL 配置
    const result = await chrome.storage.sync.get(['contenthubUrl']);
    const contenthubUrl = result.contenthubUrl || 'http://localhost:8000';

    // 提取图片 URL 列表
    const imageUrls = images.map(img => img.url);

    console.log('调用后端 OCR API:', `${contenthubUrl}/api/ocr/batch`);
    console.log('图片 URL 列表:', imageUrls);

    // 调用后端 OCR API
    const response = await fetch(`${contenthubUrl}/api/ocr/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_urls: imageUrls
      })
    });

    if (!response.ok) {
      throw new Error(`OCR API 请求失败: HTTP ${response.status}`);
    }

    const data = await response.json();

    console.log('OCR API 响应:', data);

    if (data.code === 200 && data.data && data.data.results) {
      const results = data.data.results;
      console.log(`OCR 完成: ${data.data.success}/${data.data.total} 成功`);
      return results;
    } else {
      throw new Error('OCR API 返回格式错误');
    }

  } catch (error) {
    console.error('OCR处理失败:', error);

    // 如果 API 调用失败，返回占位符
    return images.map((img, index) => ({
      index: index + 1,
      url: img.url,
      text: `OCR 失败: ${error.message}`,
      success: false,
      error: error.message
    }));
  }
}