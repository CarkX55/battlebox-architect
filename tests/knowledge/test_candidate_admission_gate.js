import { CandidateAdmissionGate } from '../../src/knowledge/compiler/CandidateAdmissionGate.js';

console.log('=== TEST: CandidateAdmissionGate Strategic Candidate Filtering ===');

const validDork = { name: 'Llanowar Elves', oracle_text: '{T}: Add {G}.' };
const tappedDork = { name: 'Restricted Dork', oracle_text: 'Enters the battlefield tapped. {T}: Add {G}.' };

const res1 = CandidateAdmissionGate.evaluateAdmission(validDork, 'Ramp');
const res2 = CandidateAdmissionGate.evaluateAdmission(tappedDork, 'Ramp');

console.log(`[PASS] Valid Dork Admitted: ${res1.admitted} (Reason: ${res1.reason})`);
console.log(`[PASS] Tapped Dork Admitted: ${res2.admitted} (Reason: ${res2.reason})`);

if (!res1.admitted) {
  console.error('FAILED: Valid dork expected admitted');
  process.exit(1);
}

if (res2.admitted) {
  console.error('FAILED: Tapped dork expected rejected by Admission Gate');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
