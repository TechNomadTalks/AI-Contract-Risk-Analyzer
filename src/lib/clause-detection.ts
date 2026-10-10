import { Clause, ClauseType, RiskLevel } from '@/types';
import { CLAUSE_RISK_CONFIGS, getClauseConfig } from './risk-config';

export function calculateRiskLevel(text: string, type: ClauseType): RiskLevel {
  const lowerText = text.toLowerCase();
  const config = getClauseConfig(type);
  
  if (!config) return 'low';
  
  let riskScore = 0;
  
  for (const indicator of config.riskIndicators) {
    if (lowerText.includes(indicator.toLowerCase())) {
      riskScore += 1;
    }
  }
  
  if (text.length > 500) riskScore += 0.5;
  if (text.length > 1000) riskScore += 1;
  
  if (riskScore >= 2) return 'high';
  if (riskScore >= 1) return 'medium';
  return 'low';
}

function findSentenceBoundary(text: string, index: number, direction: 'before' | 'after'): number {
  const searchText = direction === 'before' ? text.substring(0, index) : text.substring(index);
  const sentenceEndRegex = /[.!?]+/g;
  let match;
  let lastMatch = -1;
  
  while ((match = sentenceEndRegex.exec(searchText)) !== null) {
    lastMatch = match.index + match[0].length;
  }
  
  if (direction === 'before') {
    return lastMatch > 0 ? lastMatch : 0;
  } else {
    const absoluteIndex = index + lastMatch;
    return absoluteIndex > 0 ? absoluteIndex : text.length;
  }
}

function extractClauseText(text: string, startMatch: string, contextLength: number = 500): string {
  const matchIndex = text.toLowerCase().indexOf(startMatch.toLowerCase());
  
  if (matchIndex === -1) {
    const endBoundary = findSentenceBoundary(text, contextLength * 2, 'after');
    return text.substring(0, endBoundary).trim();
  }
  
  const startBoundary = findSentenceBoundary(text, Math.max(0, matchIndex - 100), 'before');
  const endBoundary = findSentenceBoundary(text, matchIndex + contextLength, 'after');
  
  let clauseText = text.substring(startBoundary, endBoundary);
  
  const sentences = clauseText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 3) {
    clauseText = sentences.slice(0, 3).join('. ') + '.';
  }
  
  return clauseText.trim();
}

function rangesOverlap(range1: { start: number; end: number }, range2: { start: number; end: number }, buffer: number = 50): boolean {
  return range1.start < range2.end + buffer && range1.end > range2.start - buffer;
}

function mergeRanges(ranges: { start: number; end: number }[]): { start: number; end: number }[] {
  if (ranges.length <= 1) return ranges;
  
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    
    if (current.start <= last.end + 50) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

export function detectClauses(documentId: string, text: string): Clause[] {
  const clauses: Clause[] = [];
  const allMatches: { match: RegExpMatchArray; config: typeof CLAUSE_RISK_CONFIGS[0] }[] = [];
  
  for (const config of CLAUSE_RISK_CONFIGS) {
    for (const regex of config.patterns) {
      const matches = text.matchAll(regex);
      for (const match of matches) {
        allMatches.push({ match, config });
      }
    }
  }
  
  allMatches.sort((a, b) => (a.match.index || 0) - (b.match.index || 0));
  
const processedRanges: { start: number; end: number }[] = [];
  
  for (const { match, config } of allMatches) {
    const matchIndex = match.index || 0;
    
    const overlaps = processedRanges.some(
      range => rangesOverlap(range, { start: matchIndex, end: matchIndex + match[0].length })
    );
    
    if (overlaps) continue;
    
    const clauseText = extractClauseText(text, match[0]);
    const riskLevel = calculateRiskLevel(clauseText, config.type as ClauseType);
    const riskFactors = config.riskIndicators.filter(
      indicator => clauseText.toLowerCase().includes(indicator.toLowerCase())
    );
    
    const clause: Clause = {
      id: `${documentId}-${config.type}-${clauses.length}`,
      documentId,
      type: config.type as ClauseType,
      text: clauseText,
      startIndex: matchIndex,
      endIndex: matchIndex + match[0].length,
      riskLevel,
      riskFactors,
      summary: '',
    };
    
    clauses.push(clause);
    processedRanges.push({
      start: matchIndex,
      end: matchIndex + match[0].length,
    });
  }
  
  mergeRanges(processedRanges);
  
  return clauses.sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });
}

export function calculateOverallRiskScore(clauses: Clause[]): number {
  if (clauses.length === 0) return 0;
  
  const weights = { high: 100, medium: 50, low: 20 };
  
  const totalWeight = clauses.reduce((sum, clause) => {
    return sum + weights[clause.riskLevel];
  }, 0);
  
  const maxPossible = clauses.length * 100;
  const score = Math.round((totalWeight / maxPossible) * 100);
  
  return Math.min(100, score);
}

export function getClauseTitle(type: ClauseType): string {
  const config = getClauseConfig(type);
  return config?.title || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}