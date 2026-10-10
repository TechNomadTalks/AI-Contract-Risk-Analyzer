export interface ClauseRiskConfig {
  type: string;
  title: string;
  patterns: RegExp[];
  riskIndicators: string[];
  fallbackRisks: string[];
  fallbackRecommendations: string[];
}

function createPatterns(patterns: string[]): RegExp[] {
  return patterns.map(p => new RegExp(p, 'gi'));
}

export const CLAUSE_RISK_CONFIGS: ClauseRiskConfig[] = [
  {
    type: 'termination',
    title: 'Termination',
    patterns: createPatterns([
      'termination(?:\\s+clause)?',
      'terminate(?:\\s+this\\s+agreement)?',
      'right\\s+to\\s+terminate',
      'notice\\s+of\\s+termination',
      'termination\\s+for\\s+(?:cause|convenience)',
      'term(?:\\s+and\\s+termination)?',
    ]),
    riskIndicators: ['without cause', 'immediate termination', 'unilateral termination', 'no notice', 'at will'],
    fallbackRisks: ['Unilateral termination rights', 'Short notice periods', 'Termination without cause'],
    fallbackRecommendations: ['Negotiate reasonable notice periods', 'Require written notice', 'Include termination for convenience clauses'],
  },
  {
    type: 'liability',
    title: 'Liability',
    patterns: createPatterns([
      'liability(?:\\s+and\\s+indemnification)?',
      'limitation\\s+of\\s+liability',
      'indemnif(?:y|ication)',
      'hold\\s+harmless',
      'cap(?:\\s+on\\s+liability)?',
      'maximum\\s+liability',
      'consequential\\s+damages',
    ]),
    riskIndicators: ['unlimited liability', 'no limit', 'sole liability', 'aggregate limit', 'waive', 'forever'],
    fallbackRisks: ['Unlimited liability exposure', 'No caps on damages', 'Broad indemnification'],
    fallbackRecommendations: ['Negotiate liability caps', 'Include consequential damage exclusions', 'Carve-out exceptions'],
  },
  {
    type: 'payment',
    title: 'Payment Terms',
    patterns: createPatterns([
      'payment\\s+terms?',
      'payment\\s+conditions?',
      'invoice(?:\\s+terms?)?',
      'late\\s+payment',
      'payment\\s+schedule',
      'installment',
      'fees?\\s+and\\s+payment',
    ]),
    riskIndicators: ['net 90', 'net 120', 'late fee', 'interest on late', 'accelerate', 'prepayment'],
    fallbackRisks: ['Long payment terms', 'Late fee provisions', 'Unlimited payment obligations'],
    fallbackRecommendations: ['Negotiate net 30 terms', 'Limit late fees', 'Include payment milestones'],
  },
  {
    type: 'confidentiality',
    title: 'Confidentiality',
    patterns: createPatterns([
      'confidentiality',
      'non-?disclosure',
      'proprietary\\s+information',
      'trade\\s+secrets',
      'confidential\\s+information',
      'non-?compete',
    ]),
    riskIndicators: ['perpetual', 'indefinite', 'worldwide', 'irrevocable', 'unlimited'],
    fallbackRisks: ['Perpetual obligations', 'Broad definitions', 'Unlimited scope'],
    fallbackRecommendations: ['Add time limits', 'Narrow definition of confidential info', 'Include exclusions'],
  },
  {
    type: 'intellectual_property',
    title: 'Intellectual Property',
    patterns: createPatterns([
      'intellectual\\s+property',
      'i\\.?p\\s+rights?',
      'ownership\\s+of\\s+(?:work|ip)',
      'work-?for-?hire',
      'license(?:\\s+agreement)?',
      'patent\\s+rights?',
      'copyrights?',
    ]),
    riskIndicators: ['exclusive', 'irrevocable', 'perpetual license', 'worldwide', 'transfer all rights'],
    fallbackRisks: ['IP ownership transfer', 'Broad license grants', 'Work-for-hire provisions'],
    fallbackRecommendations: ['Clarify IP ownership', 'Limit license scope', 'Negotiate retainment rights'],
  },
  {
    type: 'force_majeure',
    title: 'Force Majeure',
    patterns: createPatterns([
      'force\\s+majeure',
      'act\\s+of\\s+god',
      'unforeseeable',
      'beyond\\s+(?:reasonable\\s+)?control',
      'unavoidable',
    ]),
    riskIndicators: ['pandemic', 'epidemic', 'government action', 'war', 'terroris'],
    fallbackRisks: ['Broad force majeure definitions', 'Pandemic exclusions', 'Limited remedies'],
    fallbackRecommendations: ['Narrow definition', 'Include specific events', 'Add termination rights'],
  },
  {
    type: 'governing_law',
    title: 'Governing Law',
    patterns: createPatterns([
      'governing\\s+law',
      'jurisdiction',
      'venue',
      'arbitration',
      'applicable\\s+law',
      'choice\\s+of\\s+law',
      'dispute\\s+resolution',
    ]),
    riskIndicators: ['exclusive jurisdiction', 'mandatory arbitration', 'foreign law', 'out of state'],
    fallbackRisks: ['Unfavorable jurisdiction', 'Mandatory arbitration', 'Foreign law'],
    fallbackRecommendations: ['Negotiate home jurisdiction', 'Specify arbitration rules', 'Choose familiar law'],
  },
  {
    type: 'warranty',
    title: 'Warranty',
    patterns: createPatterns([
      'warranty(?:\\s+and\\s+disclaimer)?',
      'disclaimer',
      '"?as\\s+is"?',
      'no\\s+warranty',
      'express\\s+warranty',
      'implied\\s+warranty',
      'fitness',
    ]),
    riskIndicators: ['no warranty', 'as is', 'disclaim all', 'no merchantability', 'exclude warranty'],
    fallbackRisks: ['Broad disclaimers', 'No warranty express', 'Extended warranty periods'],
    fallbackRecommendations: ['Add express warranties', 'Limit disclaimer scope', 'Negotiate warranty period'],
  },
  {
    type: 'assignment',
    title: 'Assignment',
    patterns: createPatterns([
      'assignment(?:\\s+and\\s+transfer)?',
      'assign(?:s|able|ing)?',
      'transfer(?:\\s+rights?)?',
      'successors?\\s+and\\s+assigns',
    ]),
    riskIndicators: ['without consent', 'freely assign', 'unilateral assignment'],
    fallbackRisks: ['Unrestricted assignment', 'Assignment without consent', 'Automatic assignment'],
    fallbackRecommendations: ['Require consent for assignment', 'Add notice requirements', 'Limit assignment rights'],
  },
  {
    type: 'amendments',
    title: 'Amendments',
    patterns: createPatterns([
      'amendment(?:\\s+and\\s+modification)?',
      'modification',
      'change\\s+to\\s+(?:this\\s+)?agreement',
      'waiver(?:\\s+and\\s+amendment)?',
    ]),
    riskIndicators: ['unilateral amendment', 'no notice', 'oral modification', 'written only'],
    fallbackRisks: ['Unilateral amendments', 'No amendment process', 'Oral modification allowed'],
    fallbackRecommendations: ['Require written amendments', 'Include change process', 'Specify approval requirements'],
  },
];

export function getClauseConfig(type: string): ClauseRiskConfig | undefined {
  return CLAUSE_RISK_CONFIGS.find(c => c.type === type);
}

export function getAllClauseTypes(): string[] {
  return CLAUSE_RISK_CONFIGS.map(c => c.type);
}