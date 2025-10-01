#!/usr/bin/env tsx

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

// Correctly import the functions and classes from each package
import { ingestAndNormalize, IngestedScript } from '@preprod/ingest-normalize';
import { segmentScript, SegmentedScript } from '@preprod/segment-beats';
import { extractFeatures, FeatureExtractionOutput } from '@preprod/features-stylometry';
import { SentimentHybridProcessor, SentimentAnalysisOutput } from '@preprod/sentiment-hybrid';
import { modelTopics, TopicModelingOutput } from '@preprod/topics-modeling';
import { fuseData, FusionOutput } from '@preprod/fusion-risk';
import { generatePdfReport, generateCsvReport, generateJsonReport, generateHtmlReport } from '@preprod/reporting';

async function main() {
  const program = new Command();
  program
    .version('0.1.0')
    .description('A CLI to run the pre-production analysis pipeline')
    .option('-c, --config <path>', 'Path to the configuration file (optional)')
    .requiredOption('-i, --input <path>', 'Path to the input script file (e.g., .fdx, .txt)')
    .option('--export-pdf', 'Export the final report as a PDF')
    .option('--export-csv', 'Export the final report as a CSV')
    .option('--export-json', 'Export detailed pipeline outputs as JSON')
    .option('--export-html', 'Export a simple HTML report with charts')
    .parse(process.argv);

  const options = program.opts();
  const { input: inputPath, exportPdf, exportCsv, exportJson, exportHtml } = options;

  console.log('🚀 Starting analysis pipeline...');
  console.log(`Input file: ${inputPath}`);

  // 1. Ingestion & Normalization
  // ingestAndNormalize is a function that takes the file path
  const ingestedScript: IngestedScript = await ingestAndNormalize(inputPath);
  console.log('✅ Text normalized.');

  // 2. Segmentation
  // segmentScript is a function that takes the ingested script object
  const segmentedScript: SegmentedScript = segmentScript(ingestedScript);
  console.log(`✅ Script segmented into ${segmentedScript.scenes.length} scenes.`);

  // 3. Parallel Feature Extraction
  console.log('🔥 Running feature extraction stages in parallel...');

  // SentimentHybridProcessor is a class that needs to be instantiated and initialized
  const sentimentProcessor = new SentimentHybridProcessor();
  await sentimentProcessor.initialize(); // Important for loading the ML model

  // The other "extractors" are just functions
  const sentimentPromise = sentimentProcessor.processScript(segmentedScript);
  const featurePromise = Promise.resolve(extractFeatures(segmentedScript));
  const topicPromise = modelTopics(segmentedScript);

  const [sentimentOutput, featureOutput, topicOutput] = await Promise.all([
    sentimentPromise,
    featurePromise,
    topicPromise,
  ]);
  console.log('✅ Feature extraction complete.');

  // 4. Fusion
  console.log('✨ Fusing analysis results...');
  const fusionOutput: FusionOutput = fuseData(featureOutput, topicOutput, sentimentOutput);
  console.log('✅ Data fused successfully.');

  // Collect all pipeline outputs for JSON report
  const pipelineOutputs = {
    ingestedScript,
    segmentedScript,
    featureOutput,
    sentimentOutput,
    topicOutput,
    fusionOutput,
  };

  // 5. Reporting
  const outputDir = path.join(process.cwd(), 'data', 'artifacts'); // Changed output directory to artifacts
  await fs.mkdir(outputDir, { recursive: true });
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const reportBaseName = 'pipeline-report'; // Fixed report name

  if (exportJson) {
    console.log('📄 Generating JSON report...');
    const jsonPath = path.join(outputDir, `${reportBaseName}.json`);
    await generateJsonReport(pipelineOutputs, jsonPath);
    console.log(`✅ JSON report saved to: ${jsonPath}`);
  }

  if (exportHtml) {
    console.log('📄 Generating HTML report...');
    const htmlPath = path.join(outputDir, `${reportBaseName}.html`);
    await generateHtmlReport(fusionOutput, htmlPath);
    console.log(`✅ HTML report saved to: ${htmlPath}`);
  }

  if (exportPdf) {
    console.log('📄 Generating PDF report...');
    const pdfPath = path.join(outputDir, `${reportBaseName}.pdf`);
    await generatePdfReport(fusionOutput, pdfPath);
    console.log(`✅ PDF report saved to: ${pdfPath}`);
  }

  if (exportCsv) {
    console.log('📊 Generating CSV report...');
    const csvPath = path.join(outputDir, `${reportBaseName}.csv`);
    await generateCsvReport(fusionOutput, csvPath);
    console.log(`✅ CSV report saved to: ${csvPath}`);
  }

  console.log('🎉 Pipeline finished successfully!');
}

main().catch(error => {
  console.error('☠️ Pipeline failed:', error);
  process.exit(1);
});
