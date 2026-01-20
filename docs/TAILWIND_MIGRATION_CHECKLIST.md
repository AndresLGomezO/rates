# Tailwind CSS Migration Checklist

**Generated:** 2025-01-27  
**Purpose:** Complete inventory and planning document for migrating from custom CSS to Tailwind CSS

---

## 1. Components with CSS File Imports

| Component                                       | CSS File(s)                    | Lines | Complexity | Notes                                                                                                                                       |
| ----------------------------------------------- | ------------------------------ | ----- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/app/src/components/Modal.tsx`             | `Modal.css`                    | 170   | Medium     | Animations (fadeIn, slideUp), backdrop-filter, responsive breakpoints, pseudo-elements                                                      |
| `apps/app/src/components/SearchBar.tsx`         | `SearchBar.css`                | 312   | Hard       | Complex scroll state variants, responsive breakpoints (768px, 480px), pseudo-elements, focus-within states                                  |
| `apps/app/src/components/Filters.tsx`           | `Filters.css`                  | 163   | Medium     | Responsive breakpoints, scrollbar styling, active state variants                                                                            |
| `apps/app/src/components/LogPaymentModal.tsx`   | `LogPaymentModal.css`          | 174   | Easy       | Form styling, simple transitions, button variants                                                                                           |
| `apps/app/src/components/BatchPaymentModal.tsx` | `LogPaymentModal.css` (shared) | 174   | Medium     | Shares CSS with LogPaymentModal, complex form layouts                                                                                       |
| `apps/app/src/components/CreateAccountForm.tsx` | `CreateAccountForm.css`        | 151   | Medium     | Grid layouts, responsive breakpoints, form validation states                                                                                |
| `apps/app/src/components/NewAccountWizard.tsx`  | `NewAccountWizard.css`         | 418   | Hard       | Multi-step wizard, animations (successPulse), complex grid layouts, responsive breakpoints                                                  |
| `apps/app/src/components/PrivateLayout.tsx`     | `PrivateLayout.css`            | 578   | Hard       | Complex sidebar with expand/collapse, gradient animations (gradientShift), pseudo-elements, responsive breakpoints, body class manipulation |
| `apps/app/src/components/PublicLayout.tsx`      | `PublicLayout.css`             | 70    | Easy       | Simple centered layout, minimal styling                                                                                                     |
| `apps/app/src/pages/Dashboard.tsx`              | `Dashboard.css`                | 1426  | Hard       | Extremely complex: animations, grid layouts, hover states, responsive breakpoints (1024px, 768px, 480px), pseudo-elements, chart styling    |
| `apps/app/src/pages/AccountDetail.tsx`          | `AccountDetail.css`            | 540   | Hard       | Complex layouts, responsive breakpoints, table styling, card variants                                                                       |
| `apps/app/src/pages/Login.tsx`                  | `PublicLayout.css` (shared)    | 70    | Easy       | Uses PublicLayout styles                                                                                                                    |
| `apps/app/src/pages/AccountsByType.tsx`         | `Dashboard.css` (shared)       | 1426  | Hard       | Shares Dashboard.css, complex card layouts                                                                                                  |
| `apps/app/src/pages/MigrateAccounts.tsx`        | `Dashboard.css` (shared)       | 1426  | Hard       | Shares Dashboard.css, complex migration UI                                                                                                  |
| `apps/app/src/main.tsx`                         | `index.css`                    | 66    | Easy       | Global resets, root variables                                                                                                               |
| `apps/auth-app/src/main.tsx`                    | `index.css`                    | 192   | Medium     | Global styles, utility classes (.page, .card, .grid, .button, etc.)                                                                         |
| `apps/auth-app/src/App.tsx`                     | `index.css` (shared)           | 192   | Medium     | Uses shared index.css                                                                                                                       |

**Total CSS Files:** 13 unique files  
**Total CSS Lines:** ~5,500+ lines  
**Components with CSS:** 17 components

---

## 2. Components with Inline Styles

| Component                                       | Inline Style Count | Sample Styles                                                                                                                                                               |
| ----------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/app/src/components/NewAccountWizard.tsx`  | 1                  | `width: ${(progressIndex / 3) * 100}%` (progress bar)                                                                                                                       |
| `apps/app/src/pages/Dashboard.tsx`              | 6                  | `fontSize: '12px'`, complex style objects for charts                                                                                                                        |
| `apps/app/src/components/BatchPaymentModal.tsx` | 20+                | `fontSize: '0.9rem'`, `marginTop: '0.5rem'`, `color: '#4facfe'`, `color: '#f44336'`, complex conditional styling                                                            |
| `apps/app/src/pages/AccountDetail.tsx`          | 10+                | `width: ${metrics.progressPercentage}%`, `display: 'flex'`, `gap: '0.75rem'`, `margin: 0`                                                                                   |
| `apps/auth-app/src/pages/Landing.tsx`           | 1                  | `paddingLeft: 16, margin: 0`                                                                                                                                                |
| `apps/app/src/components/CreateAccountForm.tsx` | 3                  | `visibility: 'hidden'`, complex form styling                                                                                                                                |
| `apps/app/src/pages/AccountsByType.tsx`         | 50+                | Extensive inline styles: `color: 'white'`, `marginBottom: '1.5rem'`, `fontSize: '1rem'`, `fontWeight: 600`, `display: 'flex'`, `gap: '0.5rem'`, complex conditional styling |
| `apps/app/src/pages/MigrateAccounts.tsx`        | 60+                | Extensive inline styles: `marginBottom: '2rem'`, `marginTop: 0`, `color: 'white'`, `display: 'flex'`, `flexDirection: 'column'`, `gap: '1rem'`, complex conditional styling |

**Total Inline Style Instances:** ~118 instances  
**Primary Offenders:** `MigrateAccounts.tsx` (60+), `AccountsByType.tsx` (50+), `BatchPaymentModal.tsx` (20+)

---

## 3. Components with Style Objects

**Result:** No components found using style objects (`const styles = {}`, `StyleSheet.create()`, etc.)

All styling is done via:

- CSS file imports
- Inline `style={{}}` props
- className strings

---

## 4. className String Construction

| Component                                       | Pattern Used                        | Migration Difficulty | Examples                                                                              |
| ----------------------------------------------- | ----------------------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `apps/app/src/components/NewAccountWizard.tsx`  | Template literals with conditionals | Low                  | `className={detailsErrors.accountNumber ? 'error' : ''}`                              |
| `apps/app/src/pages/Dashboard.tsx`              | Template literals with conditionals | Low                  | ``className={`account-row ${isExpanded ? 'expanded' : ''}`}``                         |
| `apps/app/src/components/PrivateLayout.tsx`     | Template literals with conditionals | Low                  | ``className={`sidebar ${sidebarExpanded ? 'expanded' : 'collapsed'}`}``               |
| `apps/app/src/components/Filters.tsx`           | Template literals with conditionals | Low                  | ``className={`filter-chip ${statusFilters.includes(status.value) ? 'active' : ''}`}`` |
| `apps/app/src/components/SearchBar.tsx`         | Template literals with conditionals | Low                  | ``className={`search-bar-container ${isScrolled ? 'scrolled' : ''}`}``                |
| `apps/app/src/components/CreateAccountForm.tsx` | Simple conditionals                 | Low                  | `className={errors.accountNumber ? 'error' : ''}`                                     |

**Total Instances:** 33  
**Pattern:** All use template literals or simple ternary operators  
**Migration Difficulty:** Low (can use Tailwind's conditional classes or `clsx` utility)

---

## 5. CSS Modules

**Result:** No CSS modules found (`.module.css` files)

All CSS files use standard global class names.

---

## 6. CSS-in-JS / Styled Systems

**Result:** No CSS-in-JS libraries found

No usage of:

- styled-components
- emotion
- stitches
- vanilla-extract
- custom CSS-in-JS utilities

---

## 7. Global Styles & Resets

### `apps/app/src/index.css` (66 lines)

- Root CSS variables (`:root`)
- Font family definitions
- Box-sizing reset (`*`, `*::before`, `*::after`)
- HTML/body resets
- Link styling
- Color scheme media queries

**Migration Strategy:** Convert to Tailwind `@layer base` directives

### `apps/auth-app/src/index.css` (192 lines)

- Root CSS variables
- Font family definitions
- Box-sizing reset
- Body background gradients
- Utility classes (`.page`, `.card`, `.grid`, `.button`, `.input`, `.select`, `.badge`, `.error`, `.success`, `.token-box`)

**Migration Strategy:**

- Base styles → Tailwind `@layer base`
- Utility classes → Tailwind utility classes or component classes

### `packages/ui-theme/styles.css` (239 lines)

- Tailwind directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)
- Base layer: global resets, CSS variables, body/html styling
- Component layer: `.ds-card`, `.ds-button`, `.ds-input`, `.modal-overlay`, `.modal-content`, etc.
- Utility layer: `.text-gradient`, `.glass-border`, `.truncate-2`, `.truncate-3`

**Migration Strategy:** Already using Tailwind! This is the design system foundation. Components should migrate to use these classes.

---

## 8. Migration Priority Matrix

### Priority 1 — Shared / Core (Migrate First)

| Component           | Used In                                                                                                                       | Dependency Count | Notes                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------- |
| `Modal.tsx`         | NewAccountWizard, LogPaymentModal, BatchPaymentModal, CreateAccountForm, SearchBar → Filters, AccountsByType, MigrateAccounts | 7+               | Core UI component, used across entire app            |
| `SearchBar.tsx`     | PrivateLayout (all authenticated pages)                                                                                       | 4+ pages         | Global component, appears on all authenticated pages |
| `Filters.tsx`       | SearchBar → Modal (all authenticated pages)                                                                                   | 4+ pages         | Used via SearchBar on all authenticated pages        |
| `PrivateLayout.tsx` | All authenticated routes (Dashboard, AccountsByType, AccountDetail, MigrateAccounts)                                          | 4+ pages         | Root layout component                                |

**Rationale:** These components are reused across multiple pages. Migrating them first provides immediate benefits and reduces CSS file count.

---

### Priority 2 — High Impact

| Component               | Complexity | Visibility | Notes                                                  |
| ----------------------- | ---------- | ---------- | ------------------------------------------------------ |
| `PublicLayout.tsx`      | Easy       | High       | Login page - first thing users see                     |
| `LogPaymentModal.tsx`   | Easy       | High       | Frequently used modal                                  |
| `CreateAccountForm.tsx` | Medium     | High       | Account creation flow                                  |
| `Dashboard.tsx`         | Hard       | Very High  | Main landing page, most complex but highest visibility |

**Rationale:** These are visually critical and user-facing. Dashboard is complex but should be prioritized due to visibility.

---

### Priority 3 — Standard

| Component               | Complexity | Notes                                       |
| ----------------------- | ---------- | ------------------------------------------- |
| `NewAccountWizard.tsx`  | Hard       | Multi-step wizard, complex but manageable   |
| `AccountDetail.tsx`     | Hard       | Complex layouts but isolated to single page |
| `BatchPaymentModal.tsx` | Medium     | Shares CSS with LogPaymentModal             |

**Rationale:** Standard complexity, manageable migration effort.

---

### Priority 4 — Complex (Migrate Last)

| Component             | Complexity | Blockers                                             |
| --------------------- | ---------- | ---------------------------------------------------- |
| `AccountsByType.tsx`  | Hard       | Shares Dashboard.css (1426 lines), 50+ inline styles |
| `MigrateAccounts.tsx` | Hard       | Shares Dashboard.css (1426 lines), 60+ inline styles |

**Rationale:** These pages share the massive Dashboard.css file. Should be migrated after Dashboard is complete to avoid conflicts.

---

## 9. Migration Statistics

| Category                             | Count        |
| ------------------------------------ | ------------ |
| **Total components scanned**         | 30 TSX files |
| **Components with CSS imports**      | 17           |
| **Components with inline styles**    | 8            |
| **Components with style objects**    | 0            |
| **Components using CSS-in-JS**       | 0            |
| **Components using CSS modules**     | 0            |
| **Unique CSS files**                 | 13           |
| **Total CSS lines**                  | ~5,500+      |
| **Inline style instances**           | ~118         |
| **className construction instances** | 33           |

### Estimated Migration Effort

| Component Category           | Estimated Time  | Notes                                 |
| ---------------------------- | --------------- | ------------------------------------- |
| **Priority 1 (Shared/Core)** | 8-12 hours      | 4 components, high reuse              |
| **Priority 2 (High Impact)** | 12-16 hours     | Dashboard alone is 8-10 hours         |
| **Priority 3 (Standard)**    | 8-10 hours      | 3 components                          |
| **Priority 4 (Complex)**     | 6-8 hours       | 2 components, but shares CSS          |
| **Global styles cleanup**    | 2-4 hours       | index.css files                       |
| **Testing & refinement**     | 4-6 hours       | Visual regression, responsive testing |
| **Total Estimated Effort**   | **40-56 hours** | ~1-1.5 weeks for one developer        |

---

## 10. Blockers & Special Cases

### High-Risk Components

| Component              | Blocker                                                                                          | Mitigation                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `PrivateLayout.tsx`    | Body class manipulation (`body.modal-open`), complex sidebar animations, gradientShift animation | Use Tailwind's `@apply` for complex animations, or keep minimal CSS for animations |
| `Dashboard.css`        | 1426 lines, shared by 3 pages, complex animations, pseudo-elements                               | Break into smaller chunks, migrate page-by-page                                    |
| `NewAccountWizard.tsx` | Multi-step wizard with progress animations, successPulse animation                               | Use Tailwind animation utilities or keep minimal CSS for custom animations         |
| `SearchBar.tsx`        | Scroll state variants, complex responsive breakpoints                                            | Use Tailwind's responsive variants and state modifiers                             |

### Technical Challenges

1. **Animations**
   - `@keyframes fadeIn`, `slideUp`, `gradientShift`, `successPulse`, `spin`, `pulse`
   - **Solution:** Use Tailwind's `@keyframes` plugin or keep minimal CSS for custom animations

2. **Pseudo-elements**
   - Extensive use of `::before`, `::after` for decorative elements
   - **Solution:** Use Tailwind's `before:` and `after:` modifiers

3. **Backdrop-filter / Glassmorphism**
   - Heavy use of `backdrop-filter: blur()` for glass effects
   - **Solution:** Tailwind supports `backdrop-blur-*` utilities

4. **Complex Selectors**
   - `.sidebar.collapsed ~ .main-content` (sibling selectors)
   - `.search-bar-container.scrolled .search-bar` (nested selectors)
   - **Solution:** Use Tailwind's group/peer modifiers or restructure HTML

5. **Body Class Manipulation**
   - `body.modal-open` class added/removed by Modal component
   - **Solution:** Use Tailwind's `peer` or keep minimal JS for body class

6. **Shared CSS Files**
   - `Dashboard.css` shared by Dashboard, AccountsByType, MigrateAccounts
   - `LogPaymentModal.css` shared by LogPaymentModal and BatchPaymentModal
   - **Solution:** Migrate shared components first, then pages

7. **Inline Styles for Dynamic Values**
   - Progress bars: `width: ${percentage}%`
   - **Solution:** Use inline styles for truly dynamic values (acceptable in Tailwind)

8. **Print Styles**
   - None found (no `@media print`)

9. **!important Usage**
   - Check required (not scanned in detail)

10. **Deep Selector Nesting**
    - Some selectors go 3+ levels deep
    - **Solution:** Flatten structure or use Tailwind's component classes

---

## 11. Dependency Graph

### Shared Components

```
Modal
├── NewAccountWizard
├── LogPaymentModal
├── BatchPaymentModal
├── CreateAccountForm (via AccountsByType)
├── SearchBar → Filters
├── AccountsByType (delete confirmation)
└── MigrateAccounts (various modals)

SearchBar
├── PrivateLayout (all authenticated pages)
│   ├── Dashboard
│   ├── AccountsByType
│   ├── AccountDetail
│   └── MigrateAccounts
└── Filters (via Modal)

PrivateLayout
├── Dashboard
├── AccountsByType
├── AccountDetail
└── MigrateAccounts

PublicLayout
└── Login
```

### CSS File Dependencies

```
Dashboard.css
├── Dashboard.tsx
├── AccountsByType.tsx
└── MigrateAccounts.tsx

LogPaymentModal.css
├── LogPaymentModal.tsx
└── BatchPaymentModal.tsx

PublicLayout.css
├── PublicLayout.tsx
└── Login.tsx (imports from parent directory)
```

---

## 12. Quick Wins

| Component               | Reason                                                | Estimated Time |
| ----------------------- | ----------------------------------------------------- | -------------- |
| `PublicLayout.tsx`      | Simple centered layout, minimal CSS (70 lines)        | 5-10 minutes   |
| `Modal.tsx`             | Well-structured, clear separation of concerns         | 15-20 minutes  |
| `LogPaymentModal.tsx`   | Simple form styling, no complex layouts               | 20-30 minutes  |
| `CreateAccountForm.tsx` | Standard form, grid layouts map well to Tailwind      | 30-45 minutes  |
| `Filters.tsx`           | Chip-based UI, straightforward responsive breakpoints | 20-30 minutes  |

**Total Quick Wins:** ~2 hours for 5 components

---

## 13. Migration Strategy Recommendations

### Phase 1: Foundation (Week 1)

1. ✅ Tailwind + design system setup (already complete via `packages/ui-theme`)
2. Migrate global styles (`index.css` files) to Tailwind base layer
3. Migrate Priority 1 components (Modal, SearchBar, Filters, PrivateLayout)

### Phase 2: High-Impact Pages (Week 2)

1. Migrate Priority 2 components (PublicLayout, LogPaymentModal, CreateAccountForm)
2. Begin Dashboard migration (largest component)

### Phase 3: Standard Components (Week 3)

1. Complete Dashboard migration
2. Migrate Priority 3 components (NewAccountWizard, AccountDetail, BatchPaymentModal)

### Phase 4: Complex Pages (Week 4)

1. Migrate Priority 4 components (AccountsByType, MigrateAccounts)
2. Remove shared CSS files
3. Final cleanup and testing

### Phase 5: Polish (Week 5)

1. Visual regression testing
2. Responsive testing across breakpoints
3. Performance optimization
4. Documentation updates

---

## 14. Notes & Considerations

### Design System Integration

- `packages/ui-theme/styles.css` already provides Tailwind component classes (`.ds-card`, `.ds-button`, etc.)
- Components should migrate to use these design system classes where possible
- Custom component classes can be added to `@layer components` in ui-theme

### Animation Strategy

- Keep custom animations in CSS if they're complex (gradientShift, successPulse)
- Use Tailwind's animation utilities for simple transitions
- Consider extracting animations to `packages/ui-theme` for reuse

### Responsive Breakpoints

- Current breakpoints: 480px, 768px, 1024px, 1280px
- Tailwind defaults: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- May need custom breakpoints: `480px` → `xs` breakpoint

### Testing Strategy

- Visual regression testing recommended
- Test all responsive breakpoints
- Test modal interactions (body scroll lock)
- Test sidebar expand/collapse
- Test form validation states

### Performance Considerations

- Current CSS: ~5,500+ lines across 13 files
- Tailwind: Will generate utility classes on-demand
- Consider PurgeCSS configuration to remove unused utilities
- Monitor bundle size during migration

---

## 15. Risk Assessment

| Risk                         | Likelihood | Impact | Mitigation                                                     |
| ---------------------------- | ---------- | ------ | -------------------------------------------------------------- |
| Visual regressions           | Medium     | High   | Comprehensive visual testing, incremental migration            |
| Responsive breakpoint issues | Low        | Medium | Test all breakpoints, use Tailwind's responsive utilities      |
| Animation performance        | Low        | Low    | Keep complex animations in CSS if needed                       |
| Bundle size increase         | Low        | Medium | Configure PurgeCSS, monitor bundle size                        |
| Developer productivity dip   | Medium     | Low    | Provide Tailwind training/resources, use design system classes |

---

**End of Checklist**
