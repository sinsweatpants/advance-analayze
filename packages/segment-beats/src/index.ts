import { IngestedScript } from '@preprod/ingest-normalize';
import { defaults } from '../../../configs/defaults';

// Interfaces aligned with Prisma schema
export interface Beat {
  id: string;
  index: number;
  text: string;
}

export interface Scene {
  id: string;
  number: number;
  heading: string;
  location: string | null;
  timeOfDay: string | null;
  characters: string; // Stored as a JSON string
  text: string;
  beats: Beat[];
}

export interface SegmentedScript {
  scriptId: string;
  scenes: Scene[];
}

/**
 * Parses a full scene heading to extract location and time of day.
 * Example: "خارجي. حديقة عامة - نهار" -> { location: "حديقة عامة", timeOfDay: "نهار" }
 * @param heading - The full scene heading string.
 * @returns An object with location and time of day.
 */
function parseSceneHeading(heading: string): { location: string | null, timeOfDay: string | null } {
    const headingKeywordRegex = /^(?:INT\.|EXT\.|INT\/EXT\.|داخلي|خارجي)\.?\s*/i;
    const restOfHeading = heading.replace(headingKeywordRegex, '').trim();
    const parts = restOfHeading.split('-').map(p => p.trim());
    const location = parts[0] || null;
    const timeOfDay = parts[1] || null;
    return { location, timeOfDay };
}

/**
 * Segments a normalized script into scenes and beats using a more robust match-based approach.
 * @param ingestedScript - The output from the ingest-normalize stage.
 * @returns A SegmentedScript object.
 */
export function segmentScript(ingestedScript: IngestedScript): SegmentedScript {
  const { normalizedText, id: scriptId } = ingestedScript;
  const scenes: Scene[] = [];

  // Regex to find all scene heading lines
  const sceneHeaderRegex = new RegExp('^' + defaults.segment.sceneHeaderRegex + '.*$', 'gmi');
  const matches = [...normalizedText.matchAll(sceneHeaderRegex)];

  if (matches.length === 0 && normalizedText.trim().length > 0) {
      // If no headings, treat the whole text as one scene (or handle as an error)
      // For now, we are not creating a scene to avoid misinterpretation
      return { scriptId, scenes: [] };
  }

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextMatch = matches[i + 1];

    const heading = currentMatch[0].trim();
    const sceneNumber = i + 1;

    // The content is the text between the end of the current heading and the start of the next one.
    const contentStartIndex = (currentMatch.index || 0) + heading.length;
    const contentEndIndex = nextMatch ? nextMatch.index : normalizedText.length;
    const content = normalizedText.substring(contentStartIndex, contentEndIndex).trim();

    const { location, timeOfDay } = parseSceneHeading(heading);

    const lines = content.split('\n').map(l => l.trim()).filter(l => l);

    // Character extraction logic
    const characterNames = new Set<string>();
    for (let j = 0; j < lines.length; j++) {
        const currentLine = lines[j];
        const nextLine = lines[j + 1];

        // A line is a potential character name if it's short, not a parenthetical,
        // and doesn't end with sentence-ending punctuation.
        const isPotentialCandidate =
            currentLine.split(/\s+/).length <= 3 && // 1-3 words
            !currentLine.startsWith('(') &&
            !/[.?!,;:]$/.test(currentLine);

        if (isPotentialCandidate && nextLine) {
            // If the next line looks like dialogue or a parenthetical, we assume the current line is a character name.
            // This is a heuristic that works for many simple script formats.
            const isNextLineDialogueOrParen = nextLine.startsWith('(') || nextLine.length > 15;
            if (isNextLineDialogueOrParen) {
                characterNames.add(currentLine.replace(/[^ \p{L}\p{N}_]/gu, '')); // Sanitize name
            }
        }
    }

    // Simple line-based beat segmentation
    const beatTexts = content.split('\n').filter(line => line.trim() !== '');
    const beats: Beat[] = beatTexts.map((line: string, index: number) => ({
      id: `beat_${sceneNumber}-${index + 1}`,
      index: index + 1,
      text: line.trim(),
    }));

    const scene: Scene = {
      id: `scene_${sceneNumber}`,
      number: sceneNumber,
      heading,
      location,
      timeOfDay,
      characters: JSON.stringify(Array.from(characterNames)),
      text: content,
      beats,
    };

    scenes.push(scene);
  }

  return {
    scriptId,
    scenes,
  };
}