#!/usr/bin/env node

/**
 * 全プラットフォーム用ビルドスクリプト
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🌍 全プラットフォーム用ビルドを開始します...\n');

try {
  // 1. プロジェクトをビルド
  console.log('1. プロジェクトをビルド中...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ ビルド完了\n');

  // 2. 全プラットフォーム用パッケージを作成
  console.log('2. 全プラットフォーム用パッケージを作成中...');
  execSync('npx electron-builder --win --mac --linux', { stdio: 'inherit' });
  console.log('✅ 全プラットフォーム用パッケージ作成完了\n');

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

  console.log('\n🎉 全プラットフォーム用ビルドが完了しました！');
  console.log('📝 配布用ファイルが dist/ ディレクトリに作成されました。');
  console.log('💡 注意: 各プラットフォームでの配布には適切な署名が必要です。');

} catch (error) {
  console.error('❌ ビルドに失敗しました:', error.message);
  process.exit(1);
}
