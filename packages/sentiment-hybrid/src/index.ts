import { SegmentedScript, Scene } from '@preprod/segment-beats';
import { pipeline } from '@xenova/transformers';
import { defaults } from '../../../configs/defaults';

// Interface for the sentiment data of a single scene
export interface SceneSentiment {
  sceneId: string;
  label: string;
  score: number;
}

// Interface for the output of this stage
export interface SentimentAnalysisOutput {
  scriptId: string;
  model: string;
  sceneSentiments: SceneSentiment[];
}

/**
 * Analyzes the sentiment for each scene in the script.
 * @param segmentedScript - The output from the segment-beats stage.
 * @returns A SentimentAnalysisOutput object.
 */
export async function analyzeSentiment(segmentedScript: SegmentedScript): Promise<SentimentAnalysisOutput> {
  const modelName = defaults.sentiment.transformer;
  console.log(`Loading sentiment analysis model: ${modelName}`);

  // Create a text-classification pipeline
  const classifier = await pipeline('text-classification', modelName, {
    quantized: true, // Use quantized model for efficiency
  });

  console.log('Model loaded. Analyzing sentiment for each scene...');

  const sceneSentiments: SceneSentiment[] = [];

  for (const scene of segmentedScript.scenes) {
    if (scene.text.trim().length === 0) {
      console.log(`Skipping empty scene: ${scene.id}`);
      continue;
    }

    console.log(`Processing scene ${scene.number}...`);

    // The classifier returns an array of results; we'll take the top one.
    const result = await classifier(scene.text);

    // The result is an array, e.g., [{ label: 'positive', score: 0.99 }]
    if (result && result.length > 0) {
        sceneSentiments.push({
          sceneId: scene.id,
          label: result[0].label,
          score: result[0].score,
        });
    }
  }

  console.log('Sentiment analysis complete for all scenes.');

  return {
    scriptId: segmentedScript.scriptId,
    model: modelName,
    sceneSentiments,
  };
}