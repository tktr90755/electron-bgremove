#!/usr/bin/env node

/**
 * Windows用ビルドスクリプト
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🪟 Windows用ビルドを開始します...\n');

try {
  // 1. プロジェクトをビルド
  console.log('1. プロジェクトをビルド中...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ ビルド完了\n');

  // 2. Windows用パッケージを作成
  console.log('2. Windows用パッケージを作成中...');
  execSync('npx electron-builder --win --x64 --ia32', { stdio: 'inherit' });
  console.log('✅ Windows用パッケージ作成完了\n');

  // 3. 出力ファイルの確認
  const distPath = path.join(__dirname, '../dist');
  console.log('📁 出力ディレクトリ:', distPath);
  console.log('📦 作成されたファイル:');
  
  const fs = require('fs');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    files.forEach(file => {
      console.log(`   - ${file}`);
    });
  }

  console.log('\n🎉 Windows用ビルドが完了しました！');
  console.log('📝 配布用ファイルが dist/ ディレクトリに作成されました。');

} catch (error) {
  console.error('❌ ビルドに失敗しました:', error.message);
  process.exit(1);
}
