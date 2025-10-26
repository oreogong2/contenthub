#!/bin/bash

# OCR依赖安装脚本
# 用于安装Tesseract OCR引擎

echo "🔧 开始安装OCR依赖..."

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "📱 检测到macOS系统"
    
    # 检查是否安装了Homebrew
    if ! command -v brew &> /dev/null; then
        echo "❌ 未检测到Homebrew，请先安装Homebrew："
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    echo "🍺 使用Homebrew安装Tesseract..."
    brew install tesseract tesseract-lang
    
    # 安装中文语言包
    echo "🇨🇳 安装中文语言包..."
    brew install tesseract-lang
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "🐧 检测到Linux系统"
    
    # 检测发行版
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        echo "📦 使用apt安装Tesseract..."
        sudo apt-get update
        sudo apt-get install -y tesseract-ocr tesseract-ocr-chi-sim tesseract-ocr-chi-tra
        
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        echo "📦 使用yum安装Tesseract..."
        sudo yum install -y epel-release
        sudo yum install -y tesseract tesseract-langpack-chi_sim tesseract-langpack-chi_tra
        
    elif command -v dnf &> /dev/null; then
        # Fedora
        echo "📦 使用dnf安装Tesseract..."
        sudo dnf install -y tesseract tesseract-langpack-chi_sim tesseract-langpack-chi_tra
        
    else
        echo "❌ 不支持的Linux发行版，请手动安装Tesseract OCR"
        exit 1
    fi
    
else
    echo "❌ 不支持的操作系统: $OSTYPE"
    echo "请手动安装Tesseract OCR："
    echo "  - macOS: brew install tesseract tesseract-lang"
    echo "  - Ubuntu: sudo apt-get install tesseract-ocr tesseract-ocr-chi-sim"
    echo "  - CentOS: sudo yum install tesseract tesseract-langpack-chi_sim"
    exit 1
fi

# 验证安装
echo "✅ 验证Tesseract安装..."
if command -v tesseract &> /dev/null; then
    VERSION=$(tesseract --version | head -n1)
    echo "🎉 Tesseract安装成功: $VERSION"
    
    # 检查语言包
    echo "🔍 检查可用语言包..."
    tesseract --list-langs
    
    echo ""
    echo "🎯 安装完成！现在可以使用OCR功能了。"
    echo "💡 提示：如果遇到权限问题，请确保tesseract命令在PATH中"
    
else
    echo "❌ Tesseract安装失败，请检查错误信息"
    exit 1
fi
