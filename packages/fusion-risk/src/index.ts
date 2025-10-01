import { FeatureExtractionOutput } from '@preprod/features-stylometry';
import { TopicModelingOutput } from '@preprod/topics-modeling';
import { SentimentAnalysisOutput, HybridSentimentResult } from '@preprod/sentiment-hybrid';

// Interface for the final, fused data for a single scene
export interface FusedSceneData extends HybridSentimentResult {
  sceneId: string;
  wordCount: number;
  isExt: boolean;
  isNight: boolean;
  locationSwitched: boolean;
  // We can add more fields here as the pipeline grows
}

// Interface for the output of the fusion stage
export interface FusionOutput {
  scriptId: string;
  fusedScenes: FusedSceneData[];
}

/**
 * Fuses the outputs from the various analysis stages into a single data structure.
 * @param features - The output from the features-stylometry stage.
 * @param topics - The output from the topics-modeling stage.
 * @param sentiment - The output from the sentiment-hybrid stage.
 * @returns A FusionOutput object.
 */
export function fuseData(
  features: FeatureExtractionOutput,
  topics: TopicModelingOutput,
  sentiment: SentimentAnalysisOutput
): FusionOutput {
  const fusedScenes: FusedSceneData[] = [];

  // Create maps for quick lookups
  const featuresMap = new Map(features.sceneFeatures.map(f => [f.sceneId, f]));
  const sentimentMap = new Map(sentiment.sceneSentiments.map((s, i) => [features.sceneFeatures[i].sceneId, s]));

  for (const sceneFeature of features.sceneFeatures) {
    const sceneId = sceneFeature.sceneId;
    const sceneSentiment = sentimentMap.get(sceneId);

    if (!sceneSentiment) {
      console.warn(`Could not find sentiment data for scene: ${sceneId}`);
      continue;
    }

    // Destructure to exclude `characterCount` which is not part of FusedSceneData,
    // while keeping all other properties from sceneFeature, including sceneId.
    const { characterCount, ...validFeatures } = sceneFeature;

    fusedScenes.push({
      ...validFeatures,
      ...sceneSentiment,
    });
  }

  return {
    scriptId: features.scriptId,
    fusedScenes,
  };
}