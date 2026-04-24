# Power Contract - Project Overview

## Purpose
WordPress plugin for online contract signing and approval workflow. Allows site owners to create contract templates using WordPress editor with shortcodes, customers sign contracts via a frontend signature pad, and admins review/approve/reject signed contracts.

## Tech Stack
- **Backend**: PHP 8.0+, WordPress 5.7+, WooCommerce (optional integration)
- **Frontend**: TypeScript, jQuery, signature_pad, html2canvas-pro, Vite 5, TailwindCSS 3, DaisyUI 4
- **Build**: Vite (via @kucrut/vite-for-wp), pnpm 10.32.0
- **QA**: PHPStan level 6, PHPCS (WordPress standard), ESLint, Prettier, Playwright E2E tests
- **CI/CD**: GitHub Actions (Claude Code pipeline), release-it, BunnyCDN upload
- **Dependencies**: j7-dev/wp-plugin-trait (via Composer), Powerhouse plugin (runtime dependency)

## Namespace
`J7\PowerContract` - PSR-4 autoloaded from `inc/classes/`

## Key Custom Post Types
1. `contract_template` - Rich editor templates with shortcodes for fields
2. `contract` - Individual signed contracts (created via AJAX)

## Custom Post Statuses
- `pending` (default on creation)
- `approved`
- `rejected`

## Core Features
1. Contract template creation (WordPress block editor + shortcodes)
2. Frontend contract signing (signature pad, html2canvas screenshot)
3. Admin approval workflow (approve/reject/bulk actions)
4. WooCommerce integration (pre-checkout/post-checkout redirect, My Account display, order column)
5. Email notification on contract creation
6. Settings page with Shoelace web components

## Plugin Architecture
- Bootstrap pattern using SingletonTrait
- WooCommerce classes conditionally loaded
- AJAX-based contract creation
- Post status lifecycle hooks (transition_post_status)
- Template override support for themes
