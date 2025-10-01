import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import { SentimentHybridProcessor } from './index';
import { SegmentedScript } from '@preprod/segment-beats';

const program = new Command();

program
  .name('sentiment-hybrid-cli')
  .description('Analyze sentiment for each scene in a script using a hybrid approach.')
  .requiredOption('-i, --input <file>', 'Input segmented script JSON file path')
  .requiredOption('-o, --output <file>', 'Output sentiment analysis JSON file path')
  .action(async (options) => {
    try {
      console.log(`Analyzing sentiment for: ${options.input}`);

      const inputFile = await fs.readFile(options.input, 'utf-8');
      const segmentedScript: SegmentedScript = JSON.parse(inputFile);

      // Initialize the processor
      const processor = new SentimentHybridProcessor();
      await processor.initialize();

      // Process the entire script
      const results = await processor.processScript(segmentedScript);

      const outputDir = path.dirname(options.output);
      await fs.mkdir(outputDir, { recursive: true });

      // The `results` object is already in the correct format.
      await fs.writeFile(options.output, JSON.stringify(results, null, 2));

      console.log(`Successfully analyzed sentiment and saved to ${options.output}`);
    } catch (error) {
      console.error('An error occurred during sentiment analysis:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);