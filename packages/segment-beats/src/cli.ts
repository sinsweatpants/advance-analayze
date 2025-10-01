import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import { segmentScript } from './index';
import { IngestedScript } from '@preprod/ingest-normalize';
import { defaults } from '../../../configs/defaults';

const program = new Command();

program
  .name('segment-beats-cli')
  .description('Segment an ingested script into scenes and beats.')
  .requiredOption('-i, --input <file>', 'Input ingested JSON file path')
  .requiredOption('-o, --output <file>', 'Output segmented JSON file path')
  .option('--scene-header <regex>', 'Regex for scene headers', defaults.segment.sceneHeaderRegex)
  // Add other options from defaults as needed
  .action(async (options) => {
    try {
      console.log(`Segmenting script from: ${options.input}`);

      const inputFile = await fs.readFile(options.input, 'utf-8');
      const ingestedScript: IngestedScript = JSON.parse(inputFile);

      // Here we could pass options to segmentScript if it accepted them
      const result = segmentScript(ingestedScript);

      const outputDir = path.dirname(options.output);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(options.output, JSON.stringify(result, null, 2));

      console.log(`Successfully segmented and saved to ${options.output}`);
    } catch (error) {
      console.error('An error occurred during segmentation:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);