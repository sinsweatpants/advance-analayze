import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  generatePdfReport,
  generateCsvReport,
  generateJsonReport,
  generateHtmlReport,
} from './index';
import { FusionOutput } from '@preprod/fusion-risk';

// A type for the full pipeline report structure
interface PipelineReport {
    ingestedScript: any;
    segmentedScript: any;
    featureOutput: any;
    sentimentOutput: any;
    topicOutput: any;
    fusionOutput: FusionOutput;
}

const program = new Command();

program
  .name('reporting-cli')
  .description('Generate reports from a fused pipeline output JSON file.')
  .requiredOption('-i, --input <file>', 'Input pipeline report JSON file path')
  .option('-o, --output-dir <dir>', 'Directory to save the reports', 'data/artifacts')
  .option('--pdf', 'Export the final report as a PDF')
  .option('--csv', 'Export the final report as a CSV')
  .option('--html', 'Export a simple HTML report with charts')
  .action(async (options) => {
    try {
      console.log(`Generating reports from: ${options.input}`);

      const inputFile = await fs.readFile(options.input, 'utf-8');
      const reportData: PipelineReport = JSON.parse(inputFile);
      const { fusionOutput } = reportData;

      const outputDir = path.resolve(process.cwd(), options.outputDir);
      await fs.mkdir(outputDir, { recursive: true });
      const reportBaseName = path.basename(options.input, '.json');

      if (options.html) {
        const htmlPath = path.join(outputDir, `${reportBaseName}.html`);
        await generateHtmlReport(fusionOutput, htmlPath);
        console.log(`[Reporting] HTML report saved to ${htmlPath}`);
      }

      if (options.pdf) {
        const pdfPath = path.join(outputDir, `${reportBaseName}.pdf`);
        await generatePdfReport(fusionOutput, pdfPath);
        console.log(`[Reporting] PDF report saved to ${pdfPath}`);
      }

      if (options.csv) {
        const csvPath = path.join(outputDir, `${reportBaseName}.csv`);
        await generateCsvReport(fusionOutput, csvPath);
        console.log(`[Reporting] CSV report saved to ${csvPath}`);
      }

      // The full JSON is already the input, so no need to regenerate it unless specified
      console.log('All requested reports generated successfully.');

    } catch (error) {
      console.error('An error occurred during report generation:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);