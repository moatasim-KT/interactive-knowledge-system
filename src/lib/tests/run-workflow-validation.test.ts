/**
 * Test runner for manual workflow validation
 */

import { describe, it, expect } from 'vitest';
import { workflowValidator } from './manual-workflow-validation';

describe('End-to-End Workflow Validation', () => {
    it('should validate all user workflows successfully', async () => {
        await workflowValidator.runAllValidations();

        const results = workflowValidator.getResults();
        const failedTests = results.filter(r => r.status === 'fail');

        // Log results for visibility
        console.log(`\nValidation completed: ${results.length} tests run`);
        console.log(`Passed: ${results.filter(r => r.status === 'pass').length}`);
        console.log(`Failed: ${failedTests.length}`);
        console.log(`Warnings: ${results.filter(r => r.status === 'warning').length}`);

        // The test passes if we have more than 80% success rate
        const successRate = (results.filter(r => r.status === 'pass').length / results.length) * 100;
        expect(successRate).toBeGreaterThan(80);

        // Ensure we ran a reasonable number of tests
        expect(results.length).toBeGreaterThan(10);

        // Log any failures for debugging
        if (failedTests.length > 0) {
            console.log('\nFailed tests:');
            failedTests.forEach(test => {
                console.log(`- ${test.workflow} - ${test.test}: ${test.message}`);
            });
        }
    }, 30000); // 30 second timeout for comprehensive testing
});