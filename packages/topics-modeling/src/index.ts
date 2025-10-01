import { SegmentedScript, Scene } from '@preprod/segment-beats';
import { pipeline, AutoTokenizer, AutoModel } from '@xenova/transformers';
import { defaults } from '../../../configs/defaults';

// Interface for the output of this stage
// For now, we'll just store the raw embedding for each scene.
export interface SceneTopicData {
  sceneId: string;
  embedding: number[]; // A vector representing the scene's content
}

export interface TopicModelingOutput {
  scriptId: string;
  model: string;
  sceneTopics: SceneTopicData[];
}

/**
 * Generates sentence embeddings for each scene in the script.
 * @param segmentedScript - The output from the segment-beats stage.
 * @returns A TopicModelingOutput object containing embeddings.
 */
export async function modelTopics(segmentedScript: SegmentedScript): Promise<TopicModelingOutput> {
  const modelName = defaults.topics.embedModel;
  console.log(`Loading sentence-transformer model: ${modelName}`);

  // Create a feature-extraction pipeline
  const extractor = await pipeline('feature-extraction', modelName, {
    quantized: true, // Use quantized model for efficiency
  });

  console.log('Model loaded. Generating embeddings for each scene...');

  const sceneTopics: SceneTopicData[] = [];

  for (const scene of segmentedScript.scenes) {
    if (scene.text.trim().length === 0) {
      console.log(`Skipping empty scene: ${scene.id}`);
      continue;
    }

    console.log(`Processing scene ${scene.number}...`);

    // Generate embeddings for the scene text.
    // We average the embeddings of the tokens to get a single scene-level embedding.
    const output = await extractor(scene.text, { pooling: 'mean', normalize: true });

    // The output is a tensor; convert it to a standard array.
    const embedding = Array.from(output.data as Float32Array);

    sceneTopics.push({
      sceneId: scene.id,
      embedding,
    });
  }

  console.log('Embeddings generated for all scenes.');

  return {
    scriptId: segmentedScript.scriptId,
    model: modelName,
    sceneTopics,
  };
}