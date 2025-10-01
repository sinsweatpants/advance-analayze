import { promises as fs } from 'fs';
import { FusionOutput } from '@preprod/fusion-risk';
import { IngestedScript } from '@preprod/ingest-normalize';
import { SegmentedScript } from '@preprod/segment-beats';
import { FeatureExtractionOutput } from '@preprod/features-stylometry';
import { SentimentAnalysisOutput } from '@preprod/sentiment-hybrid';
import { TopicModelingOutput } from '@preprod/topics-modeling';
import * as vl from 'vega-lite';
import * as vega from 'vega';
import { compile } from 'vega-lite';

/**
 * Generates a detailed JSON report containing outputs from all pipeline stages.
 * @param pipelineOutputs - An object containing all intermediate and final outputs of the pipeline.
 * @param outputPath - The path to save the JSON file.
 */
export async function generateJsonReport(
  pipelineOutputs: {
    ingestedScript: IngestedScript;
    segmentedScript: SegmentedScript;
    featureOutput: FeatureExtractionOutput;
    sentimentOutput: SentimentAnalysisOutput;
    topicOutput: TopicModelingOutput;
    fusionOutput: FusionOutput;
  },
  outputPath: string
): Promise<void> {
  console.log(`[Reporting] Generating JSON report for script: ${pipelineOutputs.fusionOutput.scriptId}`);
  await fs.writeFile(outputPath, JSON.stringify(pipelineOutputs, null, 2));
  console.log(`[Reporting] JSON report saved to ${outputPath}`);
}

/**
 * Generates a simple HTML report with a summary table and a sentiment chart using Vega-Lite.
 * @param fusionOutput - The fused data from the pipeline.
 * @param outputPath - The path to save the HTML file.
 */
export async function generateHtmlReport(fusionOutput: FusionOutput, outputPath: string): Promise<void> {
  console.log(`[Reporting] Generating HTML report for script: ${fusionOutput.scriptId}`);

  // Prepare data for Vega-Lite chart
  const chartData = fusionOutput.fusedScenes.map(scene => ({
    sceneId: scene.sceneId,
    overallSentiment: scene.overallSentiment,
    confidence: scene.confidence,
  }));

  // Vega-Lite spec for sentiment over scenes
  const sentimentChartSpec: vl.TopLevelSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: 'Overall Sentiment per Scene',
    data: { values: chartData },
    mark: 'bar',
    encoding: {
      x: { field: 'sceneId', type: 'ordinal', title: 'Scene ID' },
      y: { field: 'confidence', type: 'quantitative', title: 'Sentiment Confidence' },
      color: { field: 'overallSentiment', type: 'nominal', title: 'Overall Sentiment' },
      tooltip: [
        { field: 'sceneId', type: 'ordinal', title: 'Scene ID' },
        { field: 'overallSentiment', type: 'nominal', title: 'Sentiment' },
        { field: 'confidence', type: 'quantitative', title: 'Confidence' },
      ],
    },
  };

  const compiledChart = compile(sentimentChartSpec).spec;
  const view = new vega.View(vega.parse(compiledChart), { renderer: 'none' }).toSVG();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pipeline Analysis Report - ${fusionOutput.scriptId}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            h1, h2 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .chart-container { margin-top: 40px; }
        </style>
    </head>
    <body>
        <h1>Pipeline Analysis Report</h1>
        <p><strong>Script ID:</strong> ${fusionOutput.scriptId}</p>

        <h2>Summary Table</h2>
        <table>
            <thead>
                <tr>
                    <th>Scene ID</th>
                    <th>Word Count</th>
                    <th>Overall Sentiment</th>
                    <th>Confidence</th>
                </tr>
            </thead>
            <tbody>
                ${fusionOutput.fusedScenes.map(scene => `
                    <tr>
                        <td>${scene.sceneId}</td>
                        <td>${scene.wordCount}</td>
                        <td>${scene.overallSentiment}</td>
                        <td>${scene.confidence.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="chart-container">
            <h2>Sentiment Analysis Chart</h2>
            ${await view}
        </div>
    </body>
    </html>
  `;

  await fs.writeFile(outputPath, htmlContent);
  console.log(`[Reporting] HTML report saved to ${outputPath}`);
}


/**
 * Generates a placeholder PDF report.
 * In a real implementation, this would use a library like PDFKit or Puppeteer.
 * @param fusionOutput - The fused data from the pipeline.
 * @param outputPath - The path to save the PDF file.
 */
export async function generatePdfReport(fusionOutput: FusionOutput, outputPath: string): Promise<void> {
  console.log(`[Reporting] Generating PDF report for script: ${fusionOutput.scriptId}`);
  const reportContent = `
    <h1>تحليل السيناريو المبدئي</h1>
    <p>معرف السيناريو: ${fusionOutput.scriptId}</p>
    <h2>المشاهد المدمجة:</h2>
    <ul>
      ${fusionOutput.fusedScenes.map(scene => `<li>Scene ${scene.sceneId}: ${scene.overallSentiment} (Confidence: ${scene.confidence.toFixed(2)})</li>`).join('')}
    </ul>
  `;
  // In a real scenario, we would generate a PDF here.
  // For now, we'll just write an HTML file as a placeholder.
  await fs.writeFile(outputPath.replace('.pdf', '.html'), reportContent);
  console.log(`[Reporting] Placeholder HTML report saved to ${outputPath.replace('.pdf', '.html')}`);
}

/**
 * Generates a CSV report from the fused data.
 * @param fusionOutput - The fused data from the pipeline.
 * @param outputPath - The path to save the CSV file.
 */
export async function generateCsvReport(fusionOutput: FusionOutput, outputPath: string): Promise<void> {
  console.log(`[Reporting] Generating CSV report for script: ${fusionOutput.scriptId}`);
  const headers = [
    'sceneId',
    'wordCount',
    'isExt',
    'isNight',
    'locationSwitched',
    'overallSentiment',
    'confidence',
    'mlSentimentLabel',
    'mlSentimentScore',
    'ruleSentimentLabel',
    'ruleSentimentScore',
    'agreementScore'
  ];

  const rows = fusionOutput.fusedScenes.map(scene => [
    scene.sceneId,
    scene.wordCount,
    scene.isExt,
    scene.isNight,
    scene.locationSwitched,
    scene.overallSentiment,
    scene.confidence,
    scene.mlSentiment.label,
    scene.mlSentiment.score,
    scene.ruleSentiment.label,
    scene.ruleSentiment.score,
    scene.agreementScore
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  await fs.writeFile(outputPath, csvContent);
  console.log(`[Reporting] CSV report saved to ${outputPath}`);
}

export const init = () => {
  console.log("reporting module bootstrap");
};
