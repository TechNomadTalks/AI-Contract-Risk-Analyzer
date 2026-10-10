import { detectClauses, calculateOverallRiskScore, getClauseTitle, calculateRiskLevel } from '@/lib/clause-detection';
import { Clause } from '@/types';

describe('Clause Detection', () => {
  describe('detectClauses', () => {
    it('should detect termination clauses', () => {
      const text = 'This agreement may be terminated by either party with 30 days notice. Termination for cause is immediate.';
      const clauses = detectClauses('doc-1', text);
      
      expect(clauses.length).toBeGreaterThan(0);
      const terminationClause = clauses.find(c => c.type === 'termination');
      expect(terminationClause).toBeDefined();
      expect(terminationClause?.text).toContain('terminated');
    });

    it('should detect liability clauses', () => {
      const text = 'The liability of either party shall not exceed the total fees paid. No consequential damages.';
      const clauses = detectClauses('doc-1', text);
      
      const liabilityClause = clauses.find(c => c.type === 'liability');
      expect(liabilityClause).toBeDefined();
      expect(liabilityClause?.text).toContain('liability');
    });

    it('should detect payment clauses', () => {
      const text = 'Payment terms are net 30. Late payments incur a 1.5% monthly fee.';
      const clauses = detectClauses('doc-1', text);
      
      const paymentClause = clauses.find(c => c.type === 'payment');
      expect(paymentClause).toBeDefined();
      expect(paymentClause?.text).toContain('payment');
    });

    it('should detect confidentiality clauses', () => {
      const text = 'Confidential information shall remain confidential for a perpetual period.';
      const clauses = detectClauses('doc-1', text);
      
      const confClause = clauses.find(c => c.type === 'confidentiality');
      expect(confClause).toBeDefined();
    });

    it('should detect intellectual property clauses', () => {
      const text = 'All intellectual property rights shall be transferred to the company.';
      const clauses = detectClauses('doc-1', text);
      
      const ipClause = clauses.find(c => c.type === 'intellectual_property');
      expect(ipClause).toBeDefined();
    });

    it('should detect force majeure clauses', () => {
      const text = 'Force majeure events including pandemic and war excuse performance.';
      const clauses = detectClauses('doc-1', text);
      
      const fmClause = clauses.find(c => c.type === 'force_majeure');
      expect(fmClause).toBeDefined();
    });

    it('should detect governing law clauses', () => {
      const text = 'This agreement shall be governed by the laws of Delaware. Exclusive jurisdiction in Delaware courts.';
      const clauses = detectClauses('doc-1', text);
      
      const glClause = clauses.find(c => c.type === 'governing_law');
      expect(glClause).toBeDefined();
    });

    it('should detect warranty clauses', () => {
      const text = 'The software is provided as is with no warranty of merchantability.';
      const clauses = detectClauses('doc-1', text);
      
      const warrantyClause = clauses.find(c => c.type === 'warranty');
      expect(warrantyClause).toBeDefined();
    });

    it('should detect assignment clauses', () => {
      const text = 'This agreement may be assigned without the consent of the other party.';
      const clauses = detectClauses('doc-1', text);
      
      const assignClause = clauses.find(c => c.type === 'assignment');
      expect(assignClause).toBeDefined();
    });

    it('should detect amendment clauses', () => {
      const text = 'Amendments must be in writing and signed by both parties.';
      const clauses = detectClauses('doc-1', text);
      
      const amendClause = clauses.find(c => c.type === 'amendments');
      expect(amendClause).toBeDefined();
    });

    it('should return empty array for text with no clauses', () => {
      const text = 'This is a simple document with no legal clauses.';
      const clauses = detectClauses('doc-1', text);
      
      expect(clauses.length).toBe(0);
    });

    it('should not detect overlapping clauses', () => {
      const text = 'Termination. This agreement may be terminated with notice. Termination for cause is immediate.';
      const clauses = detectClauses('doc-1', text);
      
      const terminationClauses = clauses.filter(c => c.type === 'termination');
      expect(terminationClauses.length).toBeLessThanOrEqual(2);
    });

    it('should sort clauses by risk level', () => {
      const text = `
        Payment terms are net 30.
        The company has unlimited liability for all damages.
        Confidential information must be kept secret forever.
      `;
      const clauses = detectClauses('doc-1', text);
      
      const riskOrder = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < clauses.length; i++) {
        expect(riskOrder[clauses[i-1].riskLevel]).toBeLessThanOrEqual(riskOrder[clauses[i].riskLevel]);
      }
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return high risk for multiple risk indicators', () => {
      const text = 'This agreement may be terminated without cause and with no notice.';
      const riskLevel = calculateRiskLevel(text, 'termination');
      expect(riskLevel).toBe('high');
    });

    it('should return medium risk for single risk indicator', () => {
      const text = 'This agreement may be terminated without cause.';
      const riskLevel = calculateRiskLevel(text, 'termination');
      expect(riskLevel).toBe('medium');
    });

    it('should return low risk for no risk indicators', () => {
      const text = 'This agreement may be terminated with 30 days written notice.';
      const riskLevel = calculateRiskLevel(text, 'termination');
      expect(riskLevel).toBe('low');
    });

    it('should increase risk for longer text', () => {
      const shortText = 'Termination without cause.';
      const longText = 'Termination without cause. '.repeat(50);
      
      const shortRisk = calculateRiskLevel(shortText, 'termination');
      const longRisk = calculateRiskLevel(longText, 'termination');
      
      const riskOrder = { high: 0, medium: 1, low: 2 };
      expect(riskOrder[longRisk]).toBeLessThanOrEqual(riskOrder[shortRisk]);
    });
  });

  describe('calculateOverallRiskScore', () => {
    it('should return 0 for empty clauses', () => {
      const score = calculateOverallRiskScore([]);
      expect(score).toBe(0);
    });

    it('should calculate score based on risk levels', () => {
      const clauses: Clause[] = [
        { id: '1', documentId: 'doc-1', type: 'termination', text: 't', startIndex: 0, endIndex: 1, riskLevel: 'high', riskFactors: [], summary: '' },
        { id: '2', documentId: 'doc-1', type: 'liability', text: 't', startIndex: 0, endIndex: 1, riskLevel: 'medium', riskFactors: [], summary: '' },
        { id: '3', documentId: 'doc-1', type: 'payment', text: 't', startIndex: 0, endIndex: 1, riskLevel: 'low', riskFactors: [], summary: '' },
      ];
      
      const score = calculateOverallRiskScore(clauses);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return 100 for all high risk clauses', () => {
      const clauses: Clause[] = [
        { id: '1', documentId: 'doc-1', type: 'termination', text: 't', startIndex: 0, endIndex: 1, riskLevel: 'high', riskFactors: [], summary: '' },
        { id: '2', documentId: 'doc-1', type: 'liability', text: 't', startIndex: 0, endIndex: 1, riskLevel: 'high', riskFactors: [], summary: '' },
      ];
      
      const score = calculateOverallRiskScore(clauses);
      expect(score).toBe(100);
    });
  });

  describe('getClauseTitle', () => {
    it('should return correct title for known clause types', () => {
      expect(getClauseTitle('termination')).toBe('Termination');
      expect(getClauseTitle('liability')).toBe('Liability');
      expect(getClauseTitle('payment')).toBe('Payment Terms');
      expect(getClauseTitle('confidentiality')).toBe('Confidentiality');
      expect(getClauseTitle('intellectual_property')).toBe('Intellectual Property');
      expect(getClauseTitle('force_majeure')).toBe('Force Majeure');
      expect(getClauseTitle('governing_law')).toBe('Governing Law');
      expect(getClauseTitle('warranty')).toBe('Warranty');
      expect(getClauseTitle('assignment')).toBe('Assignment');
      expect(getClauseTitle('amendments')).toBe('Amendments');
    });

    it('should format unknown clause types', () => {
      expect(getClauseTitle('other')).toBe('Other');
    });
  });
});