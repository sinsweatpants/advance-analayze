import { promises as fs } from 'fs';
import * as path from 'path';
import { ArabicString } from 'arabic-utils';
import he from 'he';
import { defaults } from '../../../configs/defaults';

// Interface for the output structure
export interface IngestedScript {
  id: string;
  sourceFile: string;
  rawText: string;
  normalizedText: string;
  language: string; // For now, we'll default to Arabic
}

// Interface for normalization options
export interface NormalizationOptions {
  normalizeRTL: boolean;
  digits: 'auto' | 'arabic' | 'hindi';
  stripTatweel: boolean;
  unifyPunct: boolean;
}

/**
 * Normalizes Arabic text based on the provided options.
 * @param text - The input text to normalize.
 * @param options - The normalization options.
 * @returns The normalized text.
 */
function normalizeArabicText(text: string, options: NormalizationOptions): string {
  // Decode HTML entities first, e.g., &quot; to "
  let processedText = he.decode(text);

  if (options.normalizeRTL) {
    // Use arabic-utils for what it supports
    processedText = ArabicString(processedText).normalizeAlef();

    // Manually normalize Taa Marbuta and Yaa, as they are not in the library
    processedText = processedText.replace(/ة/g, 'ه');
    processedText = processedText.replace(/ى/g, 'ي');
  }

  if (options.stripTatweel) {
    // Use arabic-utils to remove tatweel
    processedText = ArabicString(processedText).removeTatweel();
  }

  // Basic punctuation unification (can be expanded)
  if (options.unifyPunct) {
      processedText = processedText.replace(/،/g, ',').replace(/؛/g, ';');
  }

  return processedText;
}


/**
 * Ingests and normalizes a script file.
 * @param inputFile - Path to the input script file.
 * @param options - Ingestion and normalization options.
 * @returns An IngestedScript object.
 */
export async function ingestAndNormalize(
  inputFile: string,
  options: Partial<NormalizationOptions> = {}
): Promise<IngestedScript> {
  const config = { ...defaults.ingest, ...options };
  const rawText = await fs.readFile(inputFile, 'utf-8');

  const normalizedText = normalizeArabicText(rawText, config);

  const script: IngestedScript = {
    id: path.basename(inputFile, path.extname(inputFile)),
    sourceFile: inputFile,
    rawText,
    normalizedText,
    language: 'ar',
  };

  return script;
}