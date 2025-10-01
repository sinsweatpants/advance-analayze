import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import { modelTopics } from './index';
import { SegmentedScript } from '@preprod/segment-beats';

const program = new Command();

program
  .name('topics-modeling-cli')
  .description('Generate sentence embeddings for each scene in a script.')
  .requiredOption('-i, --input <file>', 'Input segmented script JSON file path')
  .requiredOption('-o, --output <file>', 'Output topics JSON file path')
  .action(async (options) => {
    try {
      console.log(`Modeling topics for: ${options.input}`);

      const inputFile = await fs.readFile(options.input, 'utf-8');
      const segmentedScript: SegmentedScript = JSON.parse(inputFile);

      const result = await modelTopics(segmentedScript);

      const outputDir = path.dirname(options.output);
      await fs.mkdir(outputDir, { recursive: true });
      // Using a custom replacer to handle the large embedding arrays more cleanly
      await fs.writeFile(options.output, JSON.stringify(result, (key, value) => {
        if (key === 'embedding' && Array.isArray(value)) {
          return `[${value.length} floats]`; // Don't serialize the full array
        }
        return value;
      }, 2));

      console.log(`Successfully generated embeddings and saved to ${options.output}`);
    } catch (error) {
      console.error('An error occurred during topic modeling:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);