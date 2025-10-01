import { SegmentedScript, Scene } from '@preprod/segment-beats';

// Interface for the features of a single scene
export interface SceneFeatures {
  sceneId: string;
  wordCount: number;
  characterCount: number;
  isExt: boolean;
  isNight: boolean;
  locationSwitched: boolean; // Did location change from previous scene?
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

    const features: SceneFeatures = {
      sceneId: scene.id,
      wordCount,
      characterCount: scene.characters.length, // This is 0 for now
      isExt,
      isNight,
      locationSwitched,
    };

    allSceneFeatures.push(features);
  }

  return {
    scriptId: segmentedScript.scriptId,
    sceneFeatures: allSceneFeatures,
  };
}