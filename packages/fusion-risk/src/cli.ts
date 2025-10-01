import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fuseData } from './index';
import { FeatureExtractionOutput } from '@preprod/features-stylometry';
import { TopicModelingOutput } from '@preprod/topics-modeling';
import { SentimentAnalysisOutput } from '@preprod/sentiment-hybrid';

const program = new Command();

program
  .name('fusion-risk-cli')
  .description('Fuse outputs from previous pipeline stages into a single data structure.')
  .requiredOption('--features <file>', 'Input features JSON file path')
  .requiredOption('--topics <file>', 'Input topics JSON file path')
  .requiredOption('--sentiment <file>', 'Input sentiment JSON file path')
  .requiredOption('-o, --output <file>', 'Output fused JSON file path')
  .action(async (options) => {
    try {
      console.log('Fusing data from multiple pipeline stages...');

      // Read all the input files
      const featuresFile = await fs.readFile(options.features, 'utf-8');
      const topicsFile = await fs.readFile(options.topics, 'utf-8');
      const sentimentFile = await fs.readFile(options.sentiment, 'utf-8');

      // Parse the JSON data
      const features: FeatureExtractionOutput = JSON.parse(featuresFile);
      const topics: TopicModelingOutput = JSON.parse(topicsFile);
      const sentiment: SentimentAnalysisOutput = JSON.parse(sentimentFile);

      // Fuse the data
      const result = fuseData(features, topics, sentiment);

      const outputDir = path.dirname(options.output);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(options.output, JSON.stringify(result, null, 2));

      console.log(`Successfully fused data and saved to ${options.output}`);
    } catch (error) {
      console.error('An error occurred during data fusion:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);