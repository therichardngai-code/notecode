# Security Audit Report

Generated: 2026-02-09

## Summary

**Total vulnerabilities:** 15 (5 moderate, 10 high)

## Vulnerabilities

### 1. electron <35.7.5 (Moderate)
- **Issue:** ASAR Integrity Bypass via resource modification
- **Advisory:** https://github.com/advisories/GHSA-vmqv-hx8q-j7mg
- **Fix:** `npm audit fix --force` (installs electron@40.2.1 - breaking change)

### 2. esbuild <=0.24.2 (Moderate)
- **Issue:** Enables any website to send requests to dev server and read response
- **Advisory:** https://github.com/advisories/GHSA-67mh-4wv8-2f99
- **Affected packages:**
  - electron/node_modules/esbuild
  - node_modules/@esbuild-kit/core-utils/node_modules/esbuild
  - node_modules/drizzle-kit/node_modules/esbuild
- **Fix:** `npm audit fix --force` (installs esbuild@0.27.3 - breaking change)

### 3. fastify <=5.7.2 (High)
- **Issues:**
  - DoS via Unbounded Memory Allocation in sendWebStream
  - Content-Type header tab character allows body validation bypass
- **Advisories:**
  - https://github.com/advisories/GHSA-mrq3-vjjr-p77c
  - https://github.com/advisories/GHSA-jx2c-rxcm-jvmq
- **Fix:** `npm audit fix --force` (installs fastify@5.7.4 - breaking change)

### 4. tar <=7.5.6 (High - Multiple)
- **Issues:**
  - Arbitrary File Overwrite and Symlink Poisoning via Insufficient Path Sanitization
  - Race Condition via Unicode Ligature Collisions on macOS APFS
  - Arbitrary File Creation/Overwrite via Hardlink Path Traversal
- **Advisories:**
  - https://github.com/advisories/GHSA-8qq5-rm4j-mr97
  - https://github.com/advisories/GHSA-r6q2-hw4h-h46w
  - https://github.com/advisories/GHSA-34x7-hfp2-rc4v
- **Affected packages:** app-builder-lib, dmg-builder, electron-builder, electron-rebuild, cacache, node-gyp
- **Fix:** `npm audit fix --force` (installs electron-rebuild@2.0.3 - breaking change)

## Recommendations

All vulnerabilities require breaking changes to fix. Recommended action plan:

1. **Short-term:** Accept current risk for development builds
2. **Medium-term:** Test with updated packages:
   ```bash
   npm audit fix --force
   npm run build
   npm run test
   ```
3. **Long-term:** Schedule upgrade sprint for:
   - electron@40.x
   - fastify@5.7.4+
   - electron-builder ecosystem

## Notes

- The esbuild vulnerability only affects development (not production builds)
- The tar vulnerabilities affect the Electron packaging pipeline
- The fastify vulnerabilities affect the backend server in production

---
*Audit performed with npm 10.x*
