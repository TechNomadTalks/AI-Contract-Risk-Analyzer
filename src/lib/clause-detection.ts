import { Clause, ClauseType, RiskLevel } from '@/types';

interface ClausePattern {
  type: ClauseType;
  patterns: RegExp[];
  riskIndicators: string[];
  title: string;
}

const clausePatterns: ClausePattern[] = [
  {
    type: 'termination',
    title: 'Termination',
    patterns: [
      /termination(?:\s+clause)?/i,
      /terminate(?:\s+this\s+agreement)?/i,
      /right\s+to\s+terminate/i,
      /notice\s+of\s+termination/i,
      /termination\s+for\s+(?:cause|convenience)/i,
      /term(?:\s+and\s+termination)?/i,
    ],
    riskIndicators: ['without cause', 'immediate termination', 'unilateral termination', 'no notice', 'at will'],
  },
  {
    type: 'liability',
    title: 'Liability',
    patterns: [
      /liability(?:\s+and\s+indemnification)?/i,
      /limitation\s+of\s+liability/i,
      /indemnif(?:y|ication)/i,
      /hold\s+harmless/i,
      /cap(?:\s+on\s+liability)?/i,
      /maximum\s+liability/i,
      /consequential\s+damages/i,
    ],
    riskIndicators: ['unlimited liability', 'no limit', 'sole liability', 'aggregate limit', 'waive', 'forever'],
  },
  {
    type: 'payment',
    title: 'Payment Terms',
    patterns: [
      /payment\s+terms?/i,
      /payment\s+conditions?/i,
      /invoice(?:\s+terms?)?/i,
      /late\s+payment/i,
      /payment\s+schedule/i,
      /installment/i,
      /fees?\s+and\s+payment/i,
    ],
    riskIndicators: ['net 90', 'net 120', 'late fee', 'interest on late', 'accelerate', 'prepayment'],
  },
  {
    type: 'confidentiality',
    title: 'Confidentiality',
    patterns: [
      /confidentiality/i,
      /non-?disclosure/i,
      /proprietary\s+information/i,
      /trade\s+secrets/i,
      /confidential\s+information/i,
      /non-?compete/i,
    ],
    riskIndicators: ['perpetual', 'indefinite', 'worldwide', 'irrevocable', 'unlimited'],
  },
  {
    type: 'intellectual_property',
    title: 'Intellectual Property',
    patterns: [
      /intellectual\s+property/i,
      /i\.?p\s+rights?/i,
      /ownership\s+of\s+(?:work|ip)/i,
      /work-?for-?hire/i,
      /license(?:\s+agreement)?/i,
      /patent\s+rights?/i,
      /copyrights?/i,
    ],
    riskIndicators: ['exclusive', 'irrevocable', 'perpetual license', 'worldwide', 'transfer all rights'],
  },
  {
    type: 'force_majeure',
    title: 'Force Majeure',
    patterns: [
      /force\s+majeure/i,
      /act\s+of\s+god/i,
      /unforeseeable/i,
      /beyond\s+(?:reasonable\s+)?control/i,
      /unavoidable/i,
    ],
    riskIndicators: ['pandemic', 'epidemic', 'government action', 'war', 'terroris'],
  },
  {
    type: 'governing_law',
    title: 'Governing Law',
    patterns: [
      /governing\s+law/i,
      /jurisdiction/i,
      /venue/i,
      /arbitration/i,
      /applicable\s+law/i,
      /choice\s+of\s+law/i,
      /dispute\s+resolution/i,
    ],
    riskIndicators: ['exclusive jurisdiction', 'mandatory arbitration', 'foreign law', 'out of state'],
  },
  {
    type: 'warranty',
    title: 'Warranty',
    patterns: [
      /warranty(?:\s+and\s+disclaimer)?/i,
      /disclaimer/i,
      /"?as\s+is"?/i,
      /no\s+warranty/i,
      /express\s+warranty/i,
      /implied\s+warranty/i,
      /fitness/i,
    ],
    riskIndicators: ['no warranty', 'as is', 'disclaim all', 'no merchantability', 'exclude warranty'],
  },
  {
    type: 'assignment',
    title: 'Assignment',
    patterns: [
      /assignment(?:\s+and\s+transfer)?/i,
      /assign(?:s|able|ing)?/i,
      /transfer(?:\s+rights?)?/i,
      /successors?\s+and\s+assigns/i,
    ],
    riskIndicators: ['without consent', 'freely assign', 'unilateral assignment'],
  },
  {
    type: 'amendments',
    title: 'Amendments',
    patterns: [
      /amendment(?:\s+and\s+modification)?/i,
      /modification/i,
      /change\s+to\s+(?:this\s+)?agreement/i,
      /waiver(?:\s+and\s+amendment)?/i,
    ],
    riskIndicators: ['unilateral amendment', 'no notice', 'oral modification', 'written only'],
  },
];

function calculateRiskLevel(text: string, type: ClauseType): RiskLevel {
  const lowerText = text.toLowerCase();
  const pattern = clausePatterns.find(p => p.type === type);
  
  if (!pattern) return 'low';
  
  let riskScore = 0;
  
  for (const indicator of pattern.riskIndicators) {
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

function extractClauseText(text: string, startMatch: string, contextLength: number = 300): string {
  const match = text.toLowerCase().includes(startMatch.toLowerCase()) 
    ? text.toLowerCase().indexOf(startMatch.toLowerCase())
    : -1;
  
  if (match === -1) {
    return text.substring(0, contextLength * 2);
  }
  
  const start = Math.max(0, match - 50);
  const end = Math.min(text.length, match + contextLength);
  
  let clauseText = text.substring(start, end);
  
  const sentences = clauseText.split(/[.!?]+/);
  if (sentences.length > 1) {
    clauseText = sentences.slice(0, 3).join('. ') + '.';
  }
  
  return clauseText.trim();
}

export function detectClauses(documentId: string, text: string): Clause[] {
  const clauses: Clause[] = [];
  const processedRanges: { start: number; end: number }[] = [];
  
  for (const pattern of clausePatterns) {
    for (const regex of pattern.patterns) {
      const matches = text.matchAll(regex);
      
      for (const match of matches) {
        const matchIndex = match.index || 0;
        
        const overlaps = processedRanges.some(
          range => matchIndex >= range.start - 100 && matchIndex <= range.end + 100
        );
        
        if (overlaps) continue;
        
        const clauseText = extractClauseText(text, match[0]);
        const riskLevel = calculateRiskLevel(clauseText, pattern.type);
        const riskFactors = pattern.riskIndicators.filter(
          indicator => clauseText.toLowerCase().includes(indicator.toLowerCase())
        );
        
        const clause: Clause = {
          id: `${documentId}-${pattern.type}-${clauses.length}`,
          documentId,
          type: pattern.type,
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
        
        break;
      }
    }
  }
  
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
  const pattern = clausePatterns.find(p => p.type === type);
  return pattern?.title || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
