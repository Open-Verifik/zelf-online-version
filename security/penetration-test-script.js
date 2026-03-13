/**
 * Quick Penetration Testing Script
 * Tests common security vulnerabilities in the Zelf API
 * 
 * Usage: node security/penetration-test-script.js
 */

const axios = require('axios');
const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const results = {
    passed: [],
    failed: [],
    warnings: []
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logResult(test, status, details) {
    const result = { test, status, details, timestamp: new Date().toISOString() };
    if (status === 'PASS') {
        results.passed.push(result);
        log(`✅ PASS: ${test}`, 'green');
    } else if (status === 'FAIL') {
        results.failed.push(result);
        log(`❌ FAIL: ${test}`, 'red');
        log(`   Details: ${details}`, 'red');
    } else {
        results.warnings.push(result);
        log(`⚠️  WARN: ${test}`, 'yellow');
        log(`   Details: ${details}`, 'yellow');
    }
}

async function testUnauthorizedAccess() {
    log('\n🔒 Testing Unauthorized Access...', 'blue');
    
    try {
        // Test protected endpoint without token
        const response = await axios.get(`${BASE_URL}/api/tags/search`, {
            validateStatus: () => true
        });
        
        if (response.status === 401) {
            logResult('Unauthorized Access Protection', 'PASS', 'Protected endpoints require authentication');
        } else {
            logResult('Unauthorized Access Protection', 'FAIL', `Expected 401, got ${response.status}`);
        }
    } catch (error) {
        logResult('Unauthorized Access Protection', 'FAIL', error.message);
    }
}

async function testInvalidToken() {
    log('\n🎫 Testing Invalid Token Handling...', 'blue');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/tags/search`, {
            headers: {
                'Authorization': 'Bearer invalid_token_12345'
            },
            validateStatus: () => true
        });
        
        if (response.status === 401) {
            logResult('Invalid Token Rejection', 'PASS', 'Invalid tokens properly rejected');
        } else {
            logResult('Invalid Token Rejection', 'FAIL', `Expected 401, got ${response.status}`);
        }
    } catch (error) {
        if (error.response?.status === 401) {
            logResult('Invalid Token Rejection', 'PASS', 'Invalid tokens properly rejected');
        } else {
            logResult('Invalid Token Rejection', 'FAIL', error.message);
        }
    }
}

async function testInputValidation() {
    log('\n📝 Testing Input Validation...', 'blue');
    
    try {
        // Test SQL injection attempt (NoSQL)
        const response = await axios.post(`${BASE_URL}/api/clients`, {
            email: { $ne: null },
            name: "'; DROP TABLE users--"
        }, {
            validateStatus: () => true
        });
        
        if (response.status === 409 || response.status === 400) {
            logResult('Input Validation (NoSQL Injection)', 'PASS', 'Malicious input properly rejected');
        } else {
            logResult('Input Validation (NoSQL Injection)', 'WARN', `Status: ${response.status}, should validate input`);
        }
    } catch (error) {
        if (error.response?.status === 409 || error.response?.status === 400) {
            logResult('Input Validation (NoSQL Injection)', 'PASS', 'Malicious input properly rejected');
        } else {
            logResult('Input Validation (NoSQL Injection)', 'WARN', error.message);
        }
    }
}

async function testRateLimiting() {
    log('\n⏱️  Testing Rate Limiting...', 'blue');
    
    try {
        // Try to make multiple rapid requests
        const requests = [];
        for (let i = 0; i < 35; i++) {
            requests.push(
                axios.get(`${BASE_URL}/api/tags/search?tagName=test.zelf`, {
                    headers: {
                        'Authorization': 'Bearer test_token'
                    },
                    validateStatus: () => true
                })
            );
        }
        
        const responses = await Promise.all(requests);
        const rateLimited = responses.some(r => r.status === 429);
        
        if (rateLimited) {
            logResult('Rate Limiting', 'PASS', 'Rate limiting active');
        } else {
            logResult('Rate Limiting', 'WARN', 'Rate limiting may not be active or threshold not reached');
        }
    } catch (error) {
        logResult('Rate Limiting', 'WARN', error.message);
    }
}

async function testCORS() {
    log('\n🌐 Testing CORS Configuration...', 'blue');
    
    try {
        const response = await axios.options(`${BASE_URL}/api/tags/search`, {
            headers: {
                'Origin': 'https://malicious-site.com',
                'Access-Control-Request-Method': 'GET'
            },
            validateStatus: () => true
        });
        
        const corsHeaders = response.headers['access-control-allow-origin'];
        if (corsHeaders) {
            logResult('CORS Configuration', 'PASS', `CORS configured: ${corsHeaders}`);
        } else {
            logResult('CORS Configuration', 'WARN', 'CORS headers not present');
        }
    } catch (error) {
        logResult('CORS Configuration', 'WARN', error.message);
    }
}

async function testErrorHandling() {
    log('\n⚠️  Testing Error Handling...', 'blue');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/nonexistent-endpoint`, {
            validateStatus: () => true
        });
        
        // Check if error response doesn't expose sensitive info
        const body = JSON.stringify(response.data);
        const sensitivePatterns = [
            /password/i,
            /secret/i,
            /key/i,
            /token/i,
            /stack trace/i,
            /error at/i
        ];
        
        const exposedSensitive = sensitivePatterns.some(pattern => pattern.test(body));
        
        if (!exposedSensitive) {
            logResult('Error Handling (Information Disclosure)', 'PASS', 'Errors do not expose sensitive information');
        } else {
            logResult('Error Handling (Information Disclosure)', 'WARN', 'Error responses may expose sensitive information');
        }
    } catch (error) {
        logResult('Error Handling (Information Disclosure)', 'WARN', error.message);
    }
}

async function testSecurityHeaders() {
    log('\n🛡️  Testing Security Headers...', 'blue');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/tags/search`, {
            validateStatus: () => true
        });
        
        const headers = response.headers;
        const securityHeaders = {
            'x-content-type-options': headers['x-content-type-options'],
            'x-frame-options': headers['x-frame-options'],
            'x-xss-protection': headers['x-xss-protection'],
            'strict-transport-security': headers['strict-transport-security']
        };
        
        const missingHeaders = Object.entries(securityHeaders)
            .filter(([key, value]) => !value)
            .map(([key]) => key);
        
        if (missingHeaders.length === 0) {
            logResult('Security Headers', 'PASS', 'All security headers present');
        } else {
            logResult('Security Headers', 'WARN', `Missing headers: ${missingHeaders.join(', ')}`);
        }
    } catch (error) {
        logResult('Security Headers', 'WARN', error.message);
    }
}

async function generateReport() {
    log('\n📊 Generating Report...', 'blue');
    
    const report = {
        date: new Date().toISOString(),
        summary: {
            total: results.passed.length + results.failed.length + results.warnings.length,
            passed: results.passed.length,
            failed: results.failed.length,
            warnings: results.warnings.length
        },
        results: {
            passed: results.passed,
            failed: results.failed,
            warnings: results.warnings
        }
    };
    
    console.log('\n' + '='.repeat(60));
    log('PENETRATION TEST SUMMARY', 'blue');
    console.log('='.repeat(60));
    log(`Total Tests: ${report.summary.total}`, 'blue');
    log(`✅ Passed: ${report.summary.passed}`, 'green');
    log(`❌ Failed: ${report.summary.failed}`, 'red');
    log(`⚠️  Warnings: ${report.summary.warnings}`, 'yellow');
    console.log('='.repeat(60));
    
    return report;
}

async function runTests() {
    log('🚀 Starting Penetration Tests...', 'blue');
    log(`Target: ${BASE_URL}\n`, 'blue');
    
    await testUnauthorizedAccess();
    await testInvalidToken();
    await testInputValidation();
    await testRateLimiting();
    await testCORS();
    await testErrorHandling();
    await testSecurityHeaders();
    
    const report = await generateReport();
    
    // Save report to file
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, 'penetration-test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n📄 Report saved to: ${reportPath}`, 'green');
}

// Run tests
runTests().catch(console.error);

