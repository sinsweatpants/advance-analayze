export const defaults = {
  ingest: { useOCR: false, normalizeRTL: true, digits: "auto", stripTatweel: true, unifyPunct: true },
  segment: {
    sceneHeaderRegex: "^(INT\\.|EXT\\.|INT\\/EXT\\.|داخلي|خارجي)",
    crfEnable: true, crfCtx: 2, beating: "texttiling", ttBlock: 14, ttSmoothing: 2,
    aliasResolution: true, speakerLinking: "hybrid"
  },
  features: { mtld: true, hdd: true, yulesK: true, posTagger: "custom-ar", syntaxDepth: true, keyphrases: "keybert", kpTopk: 8, prodLoad: true },
  topics: { bowMinDf: 2, bowMaxDf: 0.9, ldaEnable: true, ldaK: 20, ldaPasses: 10,
            embedModel: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
            minClusterSize: 8, eps: 0.7, umapNeighbors: 15, umapDim: 5 },
  sentiment: { lexicon: "ar-drama", negationScope: 4,
               transformer: "Xenova/bert-base-multilingual-uncased-sentiment",
               maxLen: 256, sarcasmClf: true, sarcasmThresh: 0.65,
               smoothing: "loess", loessSpan: 0.2 },
  xformer: { encoder: "Xenova/bert-base-multilingual-cased", maxLen: 512,
             chunkStride: 64, longSeq: "auto", longModel: "Xenova/longformer-base-4096",
             attentionWindow: 512, quantization: "int8", lora: false, calibration: "isotonic" },
  fusion: { strategy: "stacked", metaModel: "logreg", classWeight: "balanced",
            uncertainty: "conformal", alpha: 0.1,
            shapeWeights: { dSent: 0.35, topicShift: 0.25, styleShift: 0.20, conflict: 0.20 } }
} as const;