import { pipeline, env } from '@xenova/transformers';
import { SegmentedScript, Scene } from '@preprod/segment-beats';

// Disable sharp and configure the environment
env.useBrowserCache = false;
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;
process.env.TRANSFORMERS_CACHE = '/tmp/transformers-cache';

// Define the possible output types from the transformers library
interface TextClassificationSingle {
  label: string;
  score: number;
}

type TextClassificationOutput = TextClassificationSingle[];

export interface SentimentResult {
  label: string;
  score: number;
  rawScores?: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface HybridSentimentResult {
  overallSentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  mlSentiment: SentimentResult;
  ruleSentiment: {
    score: number;
    label: string;
  };
  agreementScore: number;
}

export class SentimentHybridProcessor {
  private mlClassifier: any = null;

  private readonly positiveWords = new Set([
    'good', 'great', 'excellent', 'wonderful', 'fantastic', 'amazing',
    'love', 'like', 'best', 'beautiful', 'awesome', 'perfect',
    'ممتاز', 'رائع', 'جميل', 'حلو', 'جيد', 'أحب', 'أفضل'
  ]);

  private readonly negativeWords = new Set([
    'bad', 'terrible', 'awful', 'hate', 'worst', 'horrible',
    'poor', 'disappointing', 'annoying', 'frustrating',
    'سيء', 'فظيع', 'أكره', 'أسوأ', 'مزعج', 'محبط'
  ]);

  async initialize(): Promise<void> {
    try {
      console.log('Initializing sentiment analysis model...');
      this.mlClassifier = await pipeline(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        {
          device: 'cpu',
          dtype: 'fp32'
        }
      );
      console.log('Model initialized successfully');
    } catch (error) {
      console.error('Error initializing ML model:', error);
      console.log('Falling back to rule-based sentiment analysis only');
      this.mlClassifier = null;
    }
  }

  private ruleBasedSentiment(text: string): { score: number; label: string } {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (this.positiveWords.has(word)) positiveCount++;
      if (this.negativeWords.has(word)) negativeCount++;
    }

    const totalSentimentWords = positiveCount + negativeCount;

    if (totalSentimentWords === 0) {
      return { score: 0.5, label: 'neutral' };
    }

    const score = positiveCount / totalSentimentWords;

    if (score > 0.6) return { score, label: 'positive' };
    if (score < 0.4) return { score, label: 'negative' };
    return { score, label: 'neutral' };
  }

  async analyzeSentiment(text: string): Promise<HybridSentimentResult> {
    const ruleSentiment = this.ruleBasedSentiment(text);

    let mlSentiment: SentimentResult;

    if (this.mlClassifier) {
      try {
        const result: TextClassificationOutput | TextClassificationSingle = await this.mlClassifier(text);
        
        // Handle both possible return types from the transformers library
        let classification: TextClassificationSingle;
        if (Array.isArray(result)) {
          classification = result[0];
        } else {
          classification = result as TextClassificationSingle;
        }
        
        // Type guard to ensure the label property exists
        if ("label" in classification) {
          mlSentiment = {
            label: classification.label.toLowerCase(),
            score: classification.score
          };
        } else {
          // Fallback if the result format is not as expected
          console.warn('Unexpected result format from ML classifier:', result);
          mlSentiment = {
            label: ruleSentiment.label,
            score: ruleSentiment.score
          };
        }
      } catch (error) {
        console.warn('ML classification failed, using rule-based only:', error);
        mlSentiment = {
          label: ruleSentiment.label,
          score: ruleSentiment.score
        };
      }
    } else {
      mlSentiment = {
        label: ruleSentiment.label,
        score: ruleSentiment.score
      };
    }

    const agreementScore = this.calculateAgreement(mlSentiment, ruleSentiment);
    const overallSentiment = this.combineResults(mlSentiment, ruleSentiment, agreementScore);
    const confidence = (mlSentiment.score * 0.7 + ruleSentiment.score * 0.3 + agreementScore * 0.2) / 1.2;

    return {
      overallSentiment,
      confidence: Math.min(confidence, 1.0),
      mlSentiment,
      ruleSentiment,
      agreementScore
    };
  }

  private calculateAgreement(ml: SentimentResult, rule: { label: string }): number {
    const mlLabel = ml.label.includes('pos') ? 'positive' : ml.label.includes('neg') ? 'negative' : 'neutral';
    return mlLabel === rule.label ? 1.0 : 0.3;
  }

  private combineResults(
    ml: SentimentResult,
    rule: { score: number; label: string },
    agreement: number
  ): 'positive' | 'negative' | 'neutral' {
    if (agreement > 0.7) {
      const mlLabel = ml.label.includes('pos') ? 'positive' : ml.label.includes('neg') ? 'negative' : 'neutral';
      return mlLabel as 'positive' | 'negative' | 'neutral';
    }

    const mlConfidence = ml.score;
    const ruleConfidence = Math.abs(rule.score - 0.5) * 2;

    if (mlConfidence > ruleConfidence) {
      return ml.label.includes('pos') ? 'positive' : ml.label.includes('neg') ? 'negative' : 'neutral';
    } else {
      return rule.label as 'positive' | 'negative' | 'neutral';
    }
  }

  async processScript(segmentedScript: SegmentedScript): Promise<HybridSentimentResult[]> {
    const results: HybridSentimentResult[] = [];
    for (const scene of segmentedScript.scenes) {
      const result = await this.analyzeSentiment(scene.text);
      results.push(result);
    }
    return results;
  }
}