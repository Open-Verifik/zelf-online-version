# Security Testing

This directory contains security testing scripts and reports for the Zelf Wallet Backend API.

## Quick Penetration Test

Run a quick security assessment:

```bash
# Install dependencies if needed
npm install axios

# Run penetration test script
node security/penetration-test-script.js
```

The script will test:
- ✅ Unauthorized access protection
- ✅ Invalid token handling
- ✅ Input validation (NoSQL injection)
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Error handling (information disclosure)
- ✅ Security headers

Results are saved to `penetration-test-results.json`.

## Penetration Test Report

See `penetration-test-report.md` for the detailed security assessment report.

## Manual Testing Checklist

### Authentication & Authorization
- [ ] Test endpoints without authentication
- [ ] Test with invalid JWT tokens
- [ ] Test with expired tokens
- [ ] Test token extraction from various headers

### Input Validation
- [ ] Test NoSQL injection attempts
- [ ] Test XSS payloads
- [ ] Test command injection
- [ ] Test path traversal
- [ ] Test buffer overflow attempts

### Rate Limiting
- [ ] Test rate limit thresholds
- [ ] Verify 429 responses
- [ ] Test rate limit reset

### API Security
- [ ] Test CORS configuration
- [ ] Verify error messages don't leak info
- [ ] Test session management
- [ ] Verify security headers

## Automated Tools

### OWASP ZAP
```bash
# Install OWASP ZAP
# Run automated scan
zap-cli quick-scan --self-contained --start-options '-config api.disablekey=true' http://localhost:3000
```

### npm audit
```bash
# Check for vulnerable dependencies
npm audit
npm audit fix
```

## Reporting

After running tests, update `penetration-test-report.md` with:
- Test dates
- Findings
- Remediation status
- Next review date

## Best Practices

1. Run tests regularly (quarterly minimum)
2. Test in staging environment first
3. Document all findings
4. Remediate critical issues immediately
5. Keep security documentation updated

