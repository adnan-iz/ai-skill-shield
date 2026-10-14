// Keep local/CI scans on the same engine as the web validator.
export { runSecurityScan } from '../../../lib/scanner/security'
export const SECURITY_ENGINE_VERSION = 'shared-security-2026-10-14-v1'
