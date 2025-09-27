#!/usr/bin/env node

/**
 * サンプルテストスクリプト
 * 背景除去機能のE2Eテスト用
 */

const { InferenceEngine } = require('../out/main/inference');
const { ImagePipeline } = require('../out/main/pipeline');
const path = require('path');
const fs = require('fs').promises;

async function runSampleTest() {
  console.log('🧪 サンプルテストを開始します...\n');

  try {
    // 1. 推論エンジンの初期化
    console.log('1. 推論エンジンを初期化中...');
    const inferenceEngine = new InferenceEngine();
    await inferenceEngine.initialize();
    console.log('✅ 推論エンジンの初期化完了');

    // 2. 画像パイプラインの初期化
    console.log('2. 画像パイプラインを初期化中...');
    const imagePipeline = new ImagePipeline();
    console.log('✅ 画像パイプラインの初期化完了');

    // 3. サンプル画像の確認
    const sampleImagePath = path.join(__dirname, '../assets/sample.jpg');
    const sampleImageExists = await fs.access(sampleImagePath).then(() => true).catch(() => false);
    
    if (!sampleImageExists) {
      console.log('⚠️  サンプル画像が見つかりません。テスト用の画像を配置してください:');
      console.log(`   ${sampleImagePath}`);
      console.log('\n📝 テスト用画像の準備方法:');
      console.log('   1. 人物が写った画像を用意');
      console.log('   2. assets/sample.jpg として保存');
      console.log('   3. 再度このスクリプトを実行');
      return;
    }

    // 4. 画像処理の実行
    console.log('3. 画像処理を実行中...');
    const startTime = Date.now();
    
    const mask = await inferenceEngine.processImage(sampleImagePath, {
      resizeLongEdge: 1024,
      threshold: 128,
      blurRadius: 2
    });
    
    const inferenceTime = Date.now() - startTime;
    console.log(`✅ 推論完了 (${inferenceTime}ms)`);

    // 5. 画像合成と保存
    console.log('4. 画像合成と保存中...');
    const outputPath = await imagePipeline.compositeAndSave(
      sampleImagePath,
      mask,
      {
        outDir: path.join(__dirname, '../out'),
        suffix: '_test-result'
      }
    );
    
    console.log(`✅ 処理完了: ${outputPath}`);

    // 6. 結果の確認
    const outputExists = await fs.access(outputPath).then(() => true).catch(() => false);
    if (outputExists) {
      const stats = await fs.stat(outputPath);
      console.log(`📊 出力ファイルサイズ: ${(stats.size / 1024).toFixed(2)} KB`);
    }

    // 7. パフォーマンス情報
    console.log('\n📈 パフォーマンス情報:');
    console.log(`   推論時間: ${inferenceTime}ms`);
    console.log(`   モデル: ${inferenceEngine.getModelInfo()?.name || 'Unknown'}`);
    console.log(`   プロバイダ: ${inferenceEngine.getAvailableProviders().join(', ')}`);

    console.log('\n🎉 サンプルテストが正常に完了しました！');
    console.log(`📁 結果ファイル: ${outputPath}`);

  } catch (error) {
    console.error('❌ サンプルテストでエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  runSampleTest();
}

module.exports = { runSampleTest };
