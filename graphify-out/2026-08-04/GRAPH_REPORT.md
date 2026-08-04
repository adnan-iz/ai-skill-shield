# Graph Report - .  (2026-07-18)

## Corpus Check
- 167 files · ~129,496 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 845 nodes · 1507 edges · 63 communities (54 shown, 9 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Security Routes|API Security Routes]]
- [[_COMMUNITY_Application Pages State|Application Pages State]]
- [[_COMMUNITY_Core Scanning Types|Core Scanning Types]]
- [[_COMMUNITY_Product Architecture Docs|Product Architecture Docs]]
- [[_COMMUNITY_GitHub Repository Audit|GitHub Repository Audit]]
- [[_COMMUNITY_Security Rules Samples|Security Rules Samples]]
- [[_COMMUNITY_Root Package Dependencies|Root Package Dependencies]]
- [[_COMMUNITY_Policy Engine|Policy Engine]]
- [[_COMMUNITY_Report Generation|Report Generation]]
- [[_COMMUNITY_Validation Orchestration|Validation Orchestration]]
- [[_COMMUNITY_Validation Scoring Model|Validation Scoring Model]]
- [[_COMMUNITY_Root TypeScript Configuration|Root TypeScript Configuration]]
- [[_COMMUNITY_SARIF Reporting|SARIF Reporting]]
- [[_COMMUNITY_Homepage Motion System|Homepage Motion System]]
- [[_COMMUNITY_Report UI Types|Report UI Types]]
- [[_COMMUNITY_CLI Package Configuration|CLI Package Configuration]]
- [[_COMMUNITY_Loading Skeleton UI|Loading Skeleton UI]]
- [[_COMMUNITY_Repository URL Parsing|Repository URL Parsing]]
- [[_COMMUNITY_Security Pattern Findings|Security Pattern Findings]]
- [[_COMMUNITY_Semgrep Rule Engine|Semgrep Rule Engine]]
- [[_COMMUNITY_Core Package Dependencies|Core Package Dependencies]]
- [[_COMMUNITY_Skill Frontmatter Parser|Skill Frontmatter Parser]]
- [[_COMMUNITY_Quality Assessment|Quality Assessment]]
- [[_COMMUNITY_Install Decision UI|Install Decision UI]]
- [[_COMMUNITY_Permission Manifest|Permission Manifest]]
- [[_COMMUNITY_CLI TypeScript Configuration|CLI TypeScript Configuration]]
- [[_COMMUNITY_Core TypeScript Configuration|Core TypeScript Configuration]]
- [[_COMMUNITY_CLI Scan Workflow|CLI Scan Workflow]]
- [[_COMMUNITY_Obfuscation Detection|Obfuscation Detection]]
- [[_COMMUNITY_Validation Axes|Validation Axes]]
- [[_COMMUNITY_Environment Logging|Environment Logging]]
- [[_COMMUNITY_Agent Compatibility|Agent Compatibility]]
- [[_COMMUNITY_Findings Table|Findings Table]]
- [[_COMMUNITY_GitHub Action Runtime|GitHub Action Runtime]]
- [[_COMMUNITY_Structure Validation|Structure Validation]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Naming Validation|Naming Validation]]
- [[_COMMUNITY_SARIF Tests|SARIF Tests]]
- [[_COMMUNITY_Document File Icon|Document File Icon]]
- [[_COMMUNITY_Globe Iconography|Globe Iconography]]
- [[_COMMUNITY_Support Engine Branding|Support Engine Branding]]
- [[_COMMUNITY_Motion Contract Tests|Motion Contract Tests]]
- [[_COMMUNITY_Policy Rules Page|Policy Rules Page]]
- [[_COMMUNITY_Next.js Security Configuration|Next.js Security Configuration]]
- [[_COMMUNITY_Next.js Branding|Next.js Branding]]
- [[_COMMUNITY_Vercel Branding|Vercel Branding]]
- [[_COMMUNITY_Window Iconography|Window Iconography]]
- [[_COMMUNITY_Summarizer Sample|Summarizer Sample]]
- [[_COMMUNITY_Agent Instructions|Agent Instructions]]
- [[_COMMUNITY_Community Conduct|Community Conduct]]
- [[_COMMUNITY_ESLint Configuration|ESLint Configuration]]
- [[_COMMUNITY_PostCSS Configuration|PostCSS Configuration]]
- [[_COMMUNITY_Robots Sitemap|Robots Sitemap]]
- [[_COMMUNITY_Database Initialization Test|Database Initialization Test]]
- [[_COMMUNITY_Threat Pattern Data|Threat Pattern Data]]

## God Nodes (most connected - your core abstractions)
1. `checkRateLimit()` - 29 edges
2. `Finding` - 29 edges
3. `addRateLimitHeaders()` - 28 edges
4. `ensureDatabase()` - 25 edges
5. `ValidationResult` - 23 edges
6. `runFullValidation()` - 20 edges
7. `serverError()` - 19 edges
8. `badRequest()` - 18 edges
9. `POST()` - 17 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Trust Before Installation Focus` --semantically_similar_to--> `Pre-Install Skill Review`  [INFERRED] [semantically similar]
  ROADMAP.md → README.md
- `Local Skill Scan Command` --semantically_similar_to--> `SkillShield Validate Action`  [INFERRED] [semantically similar]
  docs/cli.md → .github/actions/validate-skill/action.yml
- `SkillShield Validation Pipeline` --references--> `Eleven Weighted Scoring Axes`  [INFERRED]
  public/examples/example-skill/SKILL.md → docs/scoring.md
- `DashboardCardsProps` --references--> `ValidationResult`  [EXTRACTED]
  components/report/dashboard-cards.tsx → lib/validator/types.ts
- `FindingsTableProps` --references--> `Finding`  [EXTRACTED]
  components/report/findings-table.tsx → lib/validator/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pre-Install Decision Flow** — architecture_github_import_flow, architecture_repository_audit_engine, architecture_validation_flow, architecture_validation_engine, architecture_sqlite_persistence, architecture_report_rendering_flow, architecture_pre_install_verdict [EXTRACTED 1.00]
- **Docker Compose Service Topology** — docker_compose_runtime_topology, docker_compose_web_service, docker_compose_postgres_service [EXTRACTED 1.00]
- **Security Scanner Layers** — docs_rules_threat_patterns_layer, docs_rules_secret_detection_layer, docs_rules_obfuscation_checks_layer, docs_rules_semgrep_builtin_rules [EXTRACTED 1.00]
- **Install Decision Signals** — docs_scoring_overall_score, docs_scoring_risk_level, docs_scoring_approval_threshold, docs_scoring_install_verdict [EXTRACTED 1.00]
- **Cinematic Lift Motion System** — docs_superpowers_specs_2026_06_03_homepage_motion_design_cinematic_lift, docs_superpowers_specs_2026_06_03_homepage_motion_design_restrained_entrance_motion, docs_superpowers_specs_2026_06_03_homepage_motion_design_ambient_resting_motion, docs_superpowers_specs_2026_06_03_homepage_motion_design_reduced_motion, docs_superpowers_specs_2026_06_03_homepage_motion_design_compositor_friendly_motion [EXTRACTED 1.00]

## Communities (63 total, 9 thin omitted)

### Community 0 - "API Security Routes"
Cohesion: 0.08
Nodes (67): POST(), GET(), POST(), GET(), findingKey(), ipFromRequest(), POST(), fetchFiles() (+59 more)

### Community 1 - "Application Pages State"
Cohesion: 0.05
Nodes (40): riskBadgeColor, SortMethod, sourceIcons, inter, jetbrainsMono, metadata, HomePage(), Tab (+32 more)

### Community 2 - "Core Scanning Types"
Cohesion: 0.06
Nodes (32): extractFrontmatter(), ExtractResult, ParsedSkill, parseFrontmatter(), stripProto(), hasMultipleEncodingLayers(), HOMOGLYPH_RANGES, locateLine() (+24 more)

### Community 3 - "Product Architecture Docs"
Cohesion: 0.06
Nodes (46): SkillShield Validate Action, CI Quality Gate, Release Pipeline, Security Scan Pipeline, GitHub Repository Import Flow, Installation Trust Model, Pre-Install Verdict, Report Rendering Flow (+38 more)

### Community 4 - "GitHub Repository Audit"
Cohesion: 0.09
Nodes (31): DEFAULT_IGNORE_PATHS, fetchRepositoryAuditFiles(), fetchRepositoryMeta(), fetchWithTimeout(), findSkillDirectory(), getDefaultBranch(), githubHeaders(), ipFromRequest() (+23 more)

### Community 5 - "Security Rules Samples"
Cohesion: 0.07
Nodes (38): Base64-Encoded Payloads, Data Exfiltration, Download and Execute Remote Script, Hardcoded Secret, Multi-Layer Security Scanner, Obfuscation Checks Layer, Pipe to Shell, Secret Detection Layer (+30 more)

### Community 6 - "Root Package Dependencies"
Cohesion: 0.05
Nodes (37): dependencies, drizzle-orm, @libsql/client, marked, next, react, react-dom, uuid (+29 more)

### Community 7 - "Policy Engine"
Cohesion: 0.10
Nodes (29): RepositoryAuditFinding, applySeverityOverrides(), DESTRUCTIVE_PATTERNS, evaluatePolicy(), extractDomainsFromFinding(), getFileExtension(), isDestructiveCommand(), isNetworkFinding() (+21 more)

### Community 8 - "Report Generation"
Cohesion: 0.13
Nodes (16): CompatibilityGridProps, statusConfig, classToken(), escapeHtml(), generateHtmlReport(), generatePdfReport(), scoreToColor(), buildTreeString() (+8 more)

### Community 9 - "Validation Orchestration"
Cohesion: 0.17
Nodes (14): runSecurityScan(), detectCompatibility(), makeId(), validateFrontmatter(), validateInstallation(), buildCompatibilityAxis(), buildFileTree(), buildSummary() (+6 more)

### Community 10 - "Validation Scoring Model"
Cohesion: 0.10
Nodes (21): Approval Threshold of 70, Best Practices Axis (2%), Compatibility Axis (5%), Content Axis (5%), Dependencies Axis (3%), Do Not Install, Eleven Weighted Scoring Axes, Frontmatter Axis (18%) (+13 more)

### Community 11 - "Root TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 12 - "SARIF Reporting"
Cohesion: 0.15
Nodes (16): buildInvocations(), buildResults(), buildRules(), generateSarifReport(), SarifArtifactLocation, SarifDriver, SarifInvocation, SarifLocation (+8 more)

### Community 13 - "Homepage Motion System"
Cohesion: 0.15
Nodes (17): Ambient Glow Drift, Cinematic Lift, CSS-First Homepage Motion, GitHub Repo Default Tab, Homepage Browser QA, Homepage Motion Contract Test, Homepage Motion Implementation Plan, Reduced-Motion Support (+9 more)

### Community 14 - "Report UI Types"
Cohesion: 0.17
Nodes (10): ExportBar(), ExportBarProps, FileTreeProps, FileTreeItem, SkillPreview, TokenAnalysis, TokenBreakdownItem, ValidationAxis (+2 more)

### Community 15 - "CLI Package Configuration"
Cohesion: 0.12
Nodes (15): bin, skillshield, dependencies, chalk, commander, description, devDependencies, @types/node (+7 more)

### Community 16 - "Loading Skeleton UI"
Cohesion: 0.17
Nodes (3): CompareSkeleton(), HistorySkeleton(), ReportSkeleton()

### Community 17 - "Repository URL Parsing"
Cohesion: 0.23
Nodes (11): UrlInputProps, decodeSegment(), decodeSegments(), isGitHubHost(), isRawGitHubHost(), isSkillsHost(), joinPath(), ParsedRepositoryUrl (+3 more)

### Community 18 - "Security Pattern Findings"
Cohesion: 0.19
Nodes (9): ALL_PATTERNS, PatternDef, patterns, ThreatCategory, ThreatPattern, INSTALL_RISKS, InstallRisk, Finding (+1 more)

### Community 19 - "Semgrep Rule Engine"
Cohesion: 0.26
Nodes (12): BUILTIN_RULES, escapeRegex(), findMatch(), isExcluded(), loadBuiltinRules(), matchesPathFilter(), matchRule(), parseSemgrepRules() (+4 more)

### Community 20 - "Core Package Dependencies"
Cohesion: 0.13
Nodes (14): dependencies, marked, yaml, description, devDependencies, @types/node, typescript, main (+6 more)

### Community 21 - "Skill Frontmatter Parser"
Cohesion: 0.23
Nodes (11): extractFrontmatter(), ExtractResult, ParsedSkill, parseFrontmatter(), stripProto(), buildFileTree(), findInTree(), mergeTree() (+3 more)

### Community 22 - "Quality Assessment"
Cohesion: 0.32
Nodes (12): assessAccessibility(), assessClarity(), assessCompleteness(), assessExamples(), assessQuality(), assessReadability(), countSentences(), countWords() (+4 more)

### Community 23 - "Install Decision UI"
Cohesion: 0.21
Nodes (10): dotClasses, InstallVerdict(), InstallVerdictProps, toneClasses, ApprovalState, buildInstallDecision(), countInstallFindings(), countSevereRepoFindings() (+2 more)

### Community 24 - "Permission Manifest"
Cohesion: 0.35
Nodes (9): detectPermissionViolations(), extractDeclaredPermissions(), extractDomains(), extractEnvVars(), extractPaths(), extractPermissionManifest(), isSubPath(), PermissionManifest (+1 more)

### Community 25 - "CLI TypeScript Configuration"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+3 more)

### Community 26 - "Core TypeScript Configuration"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+3 more)

### Community 27 - "CLI Scan Workflow"
Cohesion: 0.20
Nodes (6): collectFiles(), dangerousPatterns, Finding, program, ScanResult, scanSkill()

### Community 28 - "Obfuscation Detection"
Cohesion: 0.31
Nodes (7): hasMultipleEncodingLayers(), HOMOGLYPH_RANGES, locateLine(), makeFinding(), OBFUSCATION_CHECKS, scanObfuscation(), snippetAround()

### Community 29 - "Validation Axes"
Cohesion: 0.27
Nodes (7): makeId(), validateBestPractices(), makeId(), validateContent(), makeId(), validateDependencies(), AxisResult

### Community 30 - "Environment Logging"
Cohesion: 0.25
Nodes (5): Env, envSchema, LogEntry, logger, LogLevel

### Community 31 - "Agent Compatibility"
Cohesion: 0.28
Nodes (6): AgentInfo, countPatternMatches(), findPatternMatches(), matchPattern(), SUPPORTED_AGENTS, CompatibilityMatrix

### Community 32 - "Findings Table"
Cohesion: 0.29
Nodes (5): filterOptions, FindingsTableProps, severityColors, severityOrder, SortKey

### Community 33 - "GitHub Action Runtime"
Cohesion: 0.43
Nodes (6): collectFiles(), fs, generateHtmlReport(), path, run(), validateSkill()

### Community 34 - "Structure Validation"
Cohesion: 0.43
Nodes (6): BINARY_EXTENSIONS, getDepth(), isBinaryByExtension(), makeId(), StructureValidationOptions, validateStructure()

### Community 35 - "Package Metadata"
Cohesion: 0.40
Nodes (4): description, name, private, version

### Community 36 - "Naming Validation"
Cohesion: 0.50
Nodes (4): makeId(), NamingValidationOptions, RESERVED_NAMES, validateNaming()

### Community 37 - "SARIF Tests"
Cohesion: 0.40
Nodes (3): SarifLog, SarifResult, SarifRun

### Community 38 - "Document File Icon"
Cohesion: 0.83
Nodes (4): Digital Document, Document File Icon, Folded Page Corner, Text Content Lines

### Community 39 - "Globe Iconography"
Cohesion: 1.00
Nodes (4): Globe Icon, Latitude Lines, Longitude Lines, Planet Earth

### Community 40 - "Support Engine Branding"
Cohesion: 0.83
Nodes (4): Circuit Network Motif, Support Engine, Support Engine Logo, Typographic Wordmark

### Community 41 - "Motion Contract Tests"
Cohesion: 0.50
Nodes (3): globalsSource, pageSource, root

### Community 44 - "Next.js Branding"
Cohesion: 1.00
Nodes (3): JavaScript, Next.js, Next.js Wordmark

### Community 45 - "Vercel Branding"
Cohesion: 1.00
Nodes (3): Upward Triangle Mark, Vercel, Vercel Triangle Logo

### Community 46 - "Window Iconography"
Cohesion: 1.00
Nodes (3): Application Window, Application Window Icon, Window Control Buttons

### Community 47 - "Summarizer Sample"
Cohesion: 0.67
Nodes (3): Extractive and Abstractive Summarization, Local Runtime Text Processing, Text Summarizer

## Knowledge Gaps
- **250 isolated node(s):** `fs`, `path`, `name`, `version`, `description` (+245 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Finding` connect `Security Pattern Findings` to `API Security Routes`, `Application Pages State`, `Findings Table`, `Structure Validation`, `Naming Validation`, `Policy Engine`, `Report Generation`, `Validation Orchestration`, `SARIF Reporting`, `Report UI Types`, `Semgrep Rule Engine`, `Quality Assessment`, `Obfuscation Detection`, `Validation Axes`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `ValidationResult` connect `Report UI Types` to `API Security Routes`, `Application Pages State`, `Policy Engine`, `Report Generation`, `Validation Orchestration`, `SARIF Reporting`, `Install Decision UI`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `name` to the rest of the system?**
  _263 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Security Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08043922369765066 - nodes in this community are weakly interconnected._
- **Should `Application Pages State` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Core Scanning Types` be split into smaller, more focused modules?**
  _Cohesion score 0.05697278911564626 - nodes in this community are weakly interconnected._
- **Should `Product Architecture Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.05603864734299517 - nodes in this community are weakly interconnected._