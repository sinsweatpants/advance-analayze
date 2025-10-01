import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ingestAndNormalize, NormalizationOptions } from './index';
import { defaults } from '../../../configs/defaults';

const program = new Command();

program
  .name('ingest-normalize-cli')
  .description('Ingest and normalize a script file.')
  .requiredOption('-i, --input <file>', 'Input script file path')
  .requiredOption('-o, --output <file>', 'Output JSON file path')
  .option('--normalize-rtl <boolean>', 'Enable/disable RTL normalization', defaults.ingest.normalizeRTL.toString())
  .option('--digits <type>', 'Digit conversion type (auto, arabic, hindi)', defaults.ingest.digits)
  .option('--strip-tatweel <boolean>', 'Enable/disable tatweel stripping', defaults.ingest.stripTatweel.toString())
  .option('--unify-punct <boolean>', 'Enable/disable punctuation unification', defaults.ingest.unifyPunct.toString())
  .action(async (options) => {
    try {
      console.log(`Ingesting and normalizing file: ${options.input}`);

      const normalizationOpts: NormalizationOptions = {
        normalizeRTL: options.normalizeRtl === 'true',
        digits: options.digits,
        stripTatweel: options.stripTatweel === 'true',
        unifyPunct: options.unifyPunct === 'true',
      };

      const result = await ingestAndNormalize(options.input, normalizationOpts);

      const outputDir = path.dirname(options.output);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(options.output, JSON.stringify(result, null, 2));

      console.log(`Successfully processed and saved to ${options.output}`);
    } catch (error) {
      console.error('An error occurred during processing:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);