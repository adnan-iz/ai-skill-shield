# Homepage Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved "Cinematic Lift" motion system to the homepage hero and top stat cards while keeping GitHub Repo as the default tab and preserving performance, accessibility, and reduced-motion behavior.

**Architecture:** Keep the implementation CSS-first and localized to the homepage. Add semantic motion hooks in `app/page.tsx`, drive the entrance and ambient effects from `app/globals.css`, and lock behavior in with a small regression test that verifies the homepage motion contract at the source level.

**Tech Stack:** Next.js App Router, React, Tailwind utility classes, global CSS keyframes, Vitest, Browser-based QA on `http://localhost:3000`

---

## File Structure

- `app/page.tsx`
  - Homepage JSX structure.
  - Add motion-specific semantic class names to the hero, hero badge, hero title, hero copy, stat grid, and stat cards.
  - Preserve the existing default tab state of `url`.

- `app/globals.css`
  - Add homepage-specific keyframes and motion classes.
  - Add the ambient glow/drift effect.
  - Add `prefers-reduced-motion` overrides.

- `tests/homepage/motion-contract.test.ts`
  - Source-level regression test for the homepage motion contract.
  - Assert default tab remains `url`.
  - Assert the page contains the expected motion class hooks.
  - Assert global CSS defines reduced-motion handling and the approved keyframes/classes.

### Task 1: Add a Homepage Motion Contract Test

**Files:**
- Create: `F:/agent skill validator/skill-shield/tests/homepage/motion-contract.test.ts`
- Test: `F:/agent skill validator/skill-shield/tests/homepage/motion-contract.test.ts`

- [ ] **Step 1: Write the failing test**

Create `F:/agent skill validator/skill-shield/tests/homepage/motion-contract.test.ts` with:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = process.cwd()
const pageSource = readFileSync(join(root, 'app', 'page.tsx'), 'utf8')
const globalsSource = readFileSync(join(root, 'app', 'globals.css'), 'utf8')

describe('homepage motion contract', () => {
  test('keeps GitHub repo as the default homepage tab', () => {
    expect(pageSource).toContain("useState<Tab>('url')")
    expect(pageSource).toContain("['url', 'GitHub Repo']")
  })

  test('exposes cinematic-lift motion hooks in homepage markup', () => {
    expect(pageSource).toContain('home-hero-shell')
    expect(pageSource).toContain('home-hero-badge')
    expect(pageSource).toContain('home-hero-title')
    expect(pageSource).toContain('home-hero-copy')
    expect(pageSource).toContain('home-stat-grid')
    expect(pageSource).toContain('home-stat-card home-stat-card-1')
    expect(pageSource).toContain('home-stat-card home-stat-card-2')
    expect(pageSource).toContain('home-stat-card home-stat-card-3')
  })

  test('defines cinematic-lift animation and reduced-motion support in global css', () => {
    expect(globalsSource).toContain('@keyframes homeHeroBadgeIn')
    expect(globalsSource).toContain('@keyframes homeHeroTitleIn')
    expect(globalsSource).toContain('@keyframes homeHeroCopyIn')
    expect(globalsSource).toContain('@keyframes homeStatCardIn')
    expect(globalsSource).toContain('@keyframes homeHeroGlowDrift')
    expect(globalsSource).toContain('.home-hero-shell::before')
    expect(globalsSource).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run tests/homepage/motion-contract.test.ts --maxWorkers=1 --minWorkers=1
```

Expected:

```text
FAIL  tests/homepage/motion-contract.test.ts
```

Expected failure reason:

```text
Expected substring: "home-hero-shell"
Received string: app/page.tsx contents without the motion classes
```

- [ ] **Step 3: Commit the failing test checkpoint**

Run:

```bash
git add tests/homepage/motion-contract.test.ts
git commit -m "test: add homepage motion contract"
```

Expected:

```text
[branch-name abc1234] test: add homepage motion contract
```

### Task 2: Add Homepage Motion Hooks to the JSX

**Files:**
- Modify: `F:/agent skill validator/skill-shield/app/page.tsx`
- Test: `F:/agent skill validator/skill-shield/tests/homepage/motion-contract.test.ts`

- [ ] **Step 1: Update the hero wrapper and copy with semantic motion classes**

In `F:/agent skill validator/skill-shield/app/page.tsx`, replace the current hero opening block with:

```tsx
    <div className="home-hero-shell mx-auto max-w-6xl px-4 py-16 bg-surface">
      <div className="home-hero-content mb-12">
        <div className="home-hero-badge mb-3 inline-flex items-center gap-2 rounded-full border border-shield-200/40 bg-shield-50/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-shield-700">
          <span className="material-symbols-outlined text-sm">shield</span>
          Pre-install skill security
        </div>
        <h1 className="home-hero-title text-4xl font-bold tracking-tight text-on-surface sm:text-5xl">
          Validate agent skills before they touch your environment
        </h1>
        <p className="home-hero-copy mt-2 text-lg text-on-surface-secondary">
          Upload a skill package, audit a GitHub repository, or paste raw `SKILL.md` content to review security, compatibility, and install risk in one report.
        </p>
      </div>
```

Also update the closing wrapper at the end of the component to match:

```tsx
    </div>
```

- [ ] **Step 2: Add motion class hooks to the stat card grid**

In `F:/agent skill validator/skill-shield/app/page.tsx`, replace the current stat-card section with:

```tsx
      <div className="home-stat-grid mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="home-stat-card home-stat-card-1 glass-card p-6">
          <span className="material-symbols-outlined mb-3 inline-block text-3xl text-shield-500">insights</span>
          <div className="text-3xl font-bold text-shield-600">130K+</div>
          <div className="mt-1 text-sm text-on-surface-secondary">skill packages reviewed</div>
        </div>
        <div className="home-stat-card home-stat-card-2 glass-card p-6">
          <span className="material-symbols-outlined mb-3 inline-block text-3xl text-shield-500">warning</span>
          <div className="text-3xl font-bold text-shield-600">12</div>
          <div className="mt-1 text-sm text-on-surface-secondary">threat categories tracked</div>
        </div>
        <div className="home-stat-card home-stat-card-3 glass-card p-6">
          <span className="material-symbols-outlined mb-3 inline-block text-3xl text-shield-500">extension</span>
          <div className="text-3xl font-bold text-shield-600">22+</div>
          <div className="mt-1 text-sm text-on-surface-secondary">agent ecosystems recognized</div>
        </div>
      </div>
```

- [ ] **Step 3: Run the motion contract test to verify the markup now passes and CSS still fails**

Run:

```bash
npx vitest run tests/homepage/motion-contract.test.ts --maxWorkers=1 --minWorkers=1
```

Expected:

```text
FAIL  tests/homepage/motion-contract.test.ts
```

Expected remaining failure reason:

```text
Expected substring: "@keyframes homeHeroBadgeIn"
Received string: app/globals.css contents without the new keyframes
```

- [ ] **Step 4: Commit the JSX motion hooks**

Run:

```bash
git add app/page.tsx
git commit -m "feat: add homepage motion hooks"
```

Expected:

```text
[branch-name def5678] feat: add homepage motion hooks
```

### Task 3: Implement the Cinematic Lift Motion in CSS

**Files:**
- Modify: `F:/agent skill validator/skill-shield/app/globals.css`
- Test: `F:/agent skill validator/skill-shield/tests/homepage/motion-contract.test.ts`

- [ ] **Step 1: Add homepage-specific keyframes**

In `F:/agent skill validator/skill-shield/app/globals.css`, inside `@layer utilities`, add:

```css
  @keyframes homeHeroBadgeIn {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes homeHeroTitleIn {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes homeHeroCopyIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes homeStatCardIn {
    from {
      opacity: 0;
      transform: translateY(26px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes homeHeroGlowDrift {
    0%, 100% {
      transform: translate3d(0, 0, 0) scale(1);
      opacity: 0.55;
    }
    50% {
      transform: translate3d(18px, 10px, 0) scale(1.08);
      opacity: 0.72;
    }
  }
```

- [ ] **Step 2: Add the homepage motion classes and ambient effect**

Still in `F:/agent skill validator/skill-shield/app/globals.css`, below the keyframes, add:

```css
  .home-hero-shell {
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  .home-hero-shell::before {
    content: "";
    position: absolute;
    top: 24px;
    left: -40px;
    width: 220px;
    height: 220px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(34, 197, 94, 0.18), transparent 68%);
    filter: blur(6px);
    pointer-events: none;
    z-index: -1;
    animation: homeHeroGlowDrift 12s ease-in-out infinite;
  }

  .home-hero-content,
  .home-stat-grid {
    position: relative;
    z-index: 1;
  }

  .home-hero-badge {
    opacity: 0;
    animation: homeHeroBadgeIn 560ms cubic-bezier(0.22, 1, 0.36, 1) 120ms forwards;
  }

  .home-hero-title {
    opacity: 0;
    animation: homeHeroTitleIn 720ms cubic-bezier(0.22, 1, 0.36, 1) 220ms forwards;
  }

  .home-hero-copy {
    opacity: 0;
    animation: homeHeroCopyIn 700ms cubic-bezier(0.22, 1, 0.36, 1) 320ms forwards;
  }

  .home-stat-card {
    opacity: 0;
    transform: translateY(26px);
    animation: homeStatCardIn 640ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    will-change: transform, opacity;
  }

  .home-stat-card-1 {
    animation-delay: 420ms;
  }

  .home-stat-card-2 {
    animation-delay: 500ms;
  }

  .home-stat-card-3 {
    animation-delay: 580ms;
  }
```

- [ ] **Step 3: Add reduced-motion handling**

Still in `F:/agent skill validator/skill-shield/app/globals.css`, add:

```css
  @media (prefers-reduced-motion: reduce) {
    .home-hero-shell::before,
    .home-hero-badge,
    .home-hero-title,
    .home-hero-copy,
    .home-stat-card {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }
```

- [ ] **Step 4: Run the source-level motion contract test**

Run:

```bash
npx vitest run tests/homepage/motion-contract.test.ts --maxWorkers=1 --minWorkers=1
```

Expected:

```text
PASS  tests/homepage/motion-contract.test.ts
```

- [ ] **Step 5: Commit the Cinematic Lift CSS**

Run:

```bash
git add app/globals.css tests/homepage/motion-contract.test.ts
git commit -m "feat: add cinematic lift homepage motion"
```

Expected:

```text
[branch-name ghi9012] feat: add cinematic lift homepage motion
```

### Task 4: Verify the Homepage End-to-End

**Files:**
- Modify: none
- Test: `F:/agent skill validator/skill-shield/tests/homepage/motion-contract.test.ts`

- [ ] **Step 1: Run the full test suite in single-worker mode**

Run:

```bash
$env:NODE_OPTIONS='--max-old-space-size=1024'; npm test -- --maxWorkers=1 --minWorkers=1
```

Expected:

```text
Test Files  ... passed
Tests       ... passed
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected:

```text
> eslint
```

with exit code `0` and no lint failures.

- [ ] **Step 3: Run a production build**

Run:

```bash
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 4: Run browser QA on the homepage**

Use the Browser plugin / in-app browser and verify this flow:

```text
app loads -> homepage hero animates in -> stat cards animate in after hero -> GitHub Repo tab is first and active -> page remains stable with no error overlay
```

Collect these checks:

- `await tab.url()` returns `http://localhost:3000/`
- `await tab.title()` matches the homepage title
- `await tab.dev.logs({ levels: ["error", "warn"], limit: 50 })` returns no relevant app errors
- DOM snapshot shows `GitHub Repo` before `Upload Files`
- motion is visible on initial load, not loop-heavy after rest state

- [ ] **Step 5: Commit the verified motion pass**

Run:

```bash
git add app/page.tsx app/globals.css tests/homepage/motion-contract.test.ts
git commit -m "feat: polish homepage hero motion"
```

Expected:

```text
[branch-name jkl3456] feat: polish homepage hero motion
```

## Self-Review

### Spec Coverage

- Hero motion: covered in Task 2 and Task 3.
- Stat card motion: covered in Task 2 and Task 3.
- Reduced motion: covered in Task 3.
- Preserve GitHub Repo default tab: covered by Task 1 test and Task 4 QA.
- Browser verification and no new runtime issues: covered in Task 4.

No spec gaps remain.

### Placeholder Scan

- No `TODO`, `TBD`, or deferred implementation notes remain.
- Every code-changing step includes concrete code.
- Every verification step includes an exact command and expected outcome.

### Type Consistency

- Motion class names are consistent across the test, JSX plan, and CSS plan:
  - `home-hero-shell`
  - `home-hero-badge`
  - `home-hero-title`
  - `home-hero-copy`
  - `home-stat-card`
  - `home-stat-card-1`
  - `home-stat-card-2`
  - `home-stat-card-3`

