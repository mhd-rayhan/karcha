import { allTemplates } from '@/banks/registry';
import type { ExtractedDoc } from '../extract/types';
import type { BankTemplate } from '../parse/types';

export interface DetectionResult {
  template: BankTemplate | null;
  confidence: number;
}

export function detectBankTemplate(doc: ExtractedDoc): DetectionResult {
  const fullText = doc.items.map((i) => i.text).join(' ');
  let bestTemplate: BankTemplate | null = null;
  let highestConfidence = 0;

  for (const template of allTemplates) {
    const confidence = scoreTemplate(fullText, template);
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestTemplate = template;
    }
  }

  if (highestConfidence >= 0.6 && bestTemplate) {
    return { template: bestTemplate, confidence: highestConfidence };
  }

  return { template: null, confidence: highestConfidence };
}

function scoreTemplate(text: string, template: BankTemplate): number {
  const { allOf, anyOf, noneOf } = template.detect;

  // If any noneOf pattern matches, disqualify this template
  if (noneOf?.some((pat) => new RegExp(pat, 'i').test(text))) {
    return 0;
  }

  let score = 0;

  if (allOf && allOf.length > 0) {
    const matchedAll = allOf.every((pat) => new RegExp(pat, 'i').test(text));
    if (!matchedAll) return 0;
    score += 0.5;
  }

  if (anyOf && anyOf.length > 0) {
    const matchedAny = anyOf.some((pat) => new RegExp(pat, 'i').test(text));
    if (matchedAny) {
      score += 0.4;
    }
  }

  // Bonus: header synonyms present in document
  const hasDateHeader = template.header.date.some((h) => new RegExp(h, 'i').test(text));
  const hasNarrHeader = template.header.narration.some((h) => new RegExp(h, 'i').test(text));
  if (hasDateHeader && hasNarrHeader) {
    score += 0.1;
  }

  return Math.min(1, score);
}
