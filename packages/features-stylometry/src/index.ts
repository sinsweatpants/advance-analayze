import { SegmentedScript, Scene } from '@preprod/segment-beats';

// Extended feature set
export interface SceneFeatures {
  sceneId: string;
  // Production Load Features
  wordCount: number;
  characterCount: number;
  isExt: boolean;
  isNight: boolean;
  locationSwitched: boolean; // Did location change from previous scene?
  // Stylometric Features
  avgSentenceLength: number;
}

// Interface for the output of this stage
export interface FeatureExtractionOutput {
  scriptId: string;
  sceneFeatures: SceneFeatures[];
}

/**
 * Calculates the word count of a given text.
 * @param text - The text to analyze.
 * @returns The number of words.
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Calculates the average sentence length for a given text.
 * @param text - The text to analyze.
 * @returns The average number of words per sentence.
 */
function calculateAvgSentenceLength(text: string): number {
  // Split text into sentences using common punctuation. A simple but effective heuristic.
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (sentences.length === 0 || text.trim() === '') return 0;

  const totalWords = countWords(text);
  return totalWords / sentences.length;
}

/**
 * Extracts stylometric and production load features from a segmented script.
 * @param segmentedScript - The output from the segment-beats stage.
 * @returns A FeatureExtractionOutput object.
 */
export function extractFeatures(segmentedScript: SegmentedScript): FeatureExtractionOutput {
  const allSceneFeatures: SceneFeatures[] = [];
  let previousLocation: string | null = null;

  for (const scene of segmentedScript.scenes) {
    const wordCount = countWords(scene.text);
    const isExt = scene.heading.toLowerCase().startsWith('خارجي') || scene.heading.toLowerCase().startsWith('ext');
    const isNight = scene.heading.toLowerCase().includes('ليل') || scene.heading.toLowerCase().includes('night');

    const locationSwitched = previousLocation !== null && scene.location !== previousLocation;
    previousLocation = scene.location;

    // Correctly parse character count from JSON string
    let characterCount = 0;
    try {
      const chars = JSON.parse(scene.characters);
      if (Array.isArray(chars)) {
        characterCount = chars.length;
      }
    } catch (e) {
      console.warn(`Could not parse characters for scene ${scene.id}: ${scene.characters}`);
      characterCount = 0; // Fallback
    }

    // Calculate new stylometric features
    const avgSentenceLength = calculateAvgSentenceLength(scene.text);

    const features: SceneFeatures = {
      sceneId: scene.id,
      wordCount,
      characterCount,
      isExt,
      isNight,
      locationSwitched,
      avgSentenceLength,
    };

    allSceneFeatures.push(features);
  }

  return {
    scriptId: segmentedScript.scriptId,
    sceneFeatures: allSceneFeatures,
  };
}