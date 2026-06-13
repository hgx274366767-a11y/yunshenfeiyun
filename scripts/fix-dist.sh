#!/bin/bash
# Post-build fix script for 云深飞运 UniApp → WeChat Mini Program
# Usage: ./scripts/fix-dist.sh [dist-path]
# Default dist path: apps/client/dist/build/mp-weixin

set -e

DIST="${1:-apps/client/dist/build/mp-weixin}"

if [ ! -d "$DIST" ]; then
  echo "Error: dist directory not found: $DIST"
  exit 1
fi

echo "=== Applying post-build fixes to $DIST ==="

# 1. Add u-t="m" to all <van-*> tags in WXML files (using Node.js for correct handling)
echo "1/5 Adding u-t=\"m\" to van-* tags..."
node -e "
const fs = require('fs');
const path = require('path');
const distDir = '$DIST';

function fixWxml(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  // Fix self-closing tags: <van-xxx ... /> -> <van-xxx ... u-t=\"m\"/>
  content = content.replace(/<van-([a-z][^>]*?)\s*\/>/g, (match, attrs) => {
    if (attrs.includes('u-t=\"m\"')) return match;
    return '<van-' + attrs + ' u-t=\"m\"/>';
  });
  // Fix pair opening tags: <van-xxx ... > (not closing tags)
  content = content.replace(/<van-([a-z][^>]*[^/])>/g, (match, attrs) => {
    if (attrs.includes('u-t=\"m\"')) return match;
    return '<van-' + attrs + ' u-t=\"m\">';
  });
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'miniprogram_npm') {
      walk(full);
    } else if (entry.name.endsWith('.wxml')) {
      if (fixWxml(full)) {
        console.log('  Fixed:', full.replace(distDir, ''));
        count++;
      }
    }
  }
}
walk(distDir);
console.log('  WXML fix done. Fixed ' + count + ' files.');
"

# 2. Fix lib/ paths in page JSON usingComponents
echo "2/4 Checking for lib/ paths in JSON..."
find "$DIST" -name "*.json" -type f | while read f; do
  if grep -q '@vant/weapp/lib/' "$f" 2>/dev/null; then
    sed -i '' 's|@vant/weapp/lib/|@vant/weapp/|g' "$f"
    echo "  Fixed lib/ path: $(basename "$(dirname "$f")")/$(basename "$f")"
  fi
done

# 3. Add uP property to Vant component.js
echo "3/4 Adding uP property to Vant component.js..."
for f in "$DIST/miniprogram_npm/@vant/weapp/common/component.js"; do
  if [ -f "$f" ]; then
    if ! grep -q "properties.uP" "$f"; then
      sed -i '' 's/Component(options);/options.properties = options.properties || {};\n    options.properties.uP = null;\n    Component(options);/' "$f"
      echo "  Fixed: miniprogram_npm component.js"
    else
      echo "  Already fixed: miniprogram_npm component.js"
    fi
  fi
done

# 4. Ensure package.json exists for npm build
echo "4/4 Setting up npm infrastructure..."
if [ ! -f "$DIST/package.json" ]; then
  cat > "$DIST/package.json" << 'PKGJSON'
{
  "dependencies": {
    "@vant/weapp": "^1.11.0"
  }
}
PKGJSON
  echo "  Created package.json"
fi

if [ ! -d "$DIST/node_modules/@vant/weapp" ]; then
  mkdir -p "$DIST/node_modules/@vant"
  cp -r "$(dirname "$DIST")/../../node_modules/@vant/weapp" "$DIST/node_modules/@vant/" 2>/dev/null || true
  echo "  Copied node_modules/@vant/weapp"
fi

echo "=== Done. Open in WeChat DevTools and run: 工具 → 构建 npm ==="
