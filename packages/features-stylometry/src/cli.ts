import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import { extractFeatures } from './index';
import { SegmentedScript } from '@preprod/segment-beats';

const program = new Command();

program
  .name('features-stylometry-cli')
  .description('Extract stylometric and production load features from a segmented script.')
  .requiredOption('-i, --input <file>', 'Input segmented script JSON file path')
  .requiredOption('-o, --output <file>', 'Output features JSON file path')
  // Options for specific features can be added here later
  .action(async (options) => {
    try {
      console.log(`Extracting features from: ${options.input}`);

      const inputFile = await fs.readFile(options.input, 'utf-8');
      const segmentedScript: SegmentedScript = JSON.parse(inputFile);

      const result = extractFeatures(segmentedScript);

      const outputDir = path.dirname(options.output);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(options.output, JSON.stringify(result, null, 2));

      console.log(`Successfully extracted features and saved to ${options.output}`);
    } catch (error) {
      console.error('An error occurred during feature extraction:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);