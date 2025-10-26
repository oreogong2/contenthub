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
  const selectors = [
    // 小红书
    '.note-text',
    '.desc',
    '.content',
    '.text-content',
    '[data-testid="note-text"]',
    '.note-detail .desc',
    '.note-detail .content',
    
    // 推特
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

// 提取图片
function extractImages() {
  const selectors = [
    // 小红书
    '.swiper-slide img',
    '.note-image img',
    '.image img',
    '.carousel img',
    '.swiper-wrapper img',
    
    // 推特
    'img[src*="pbs.twimg.com"]',
    '.media img',
    '.tweet-image img',
    '[data-testid="tweetPhoto"] img',
    
    // 微博
    'img[src*="sinaimg.cn"]',
    '.media img',
    '.weibo-image img',
    '.WB_pic img',
    
    // ContentHub
    '.ant-image img',
    '.ant-avatar img',
    
    // 通用
    'img[src*="http"]',
    '.image img',
    '.photo img',
    '.media img'
  ];

  const images = [];
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(img => {
      if (img.src && img.src.startsWith('http') && !img.src.includes('data:')) {
        images.push({
          index: images.length + 1,
          url: img.src
        });
      }
    });
  }
  
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