# Code Style & Conventions

## PHP
- `declare(strict_types=1)` in every file
- PSR-4 namespace: `J7\PowerContract\...`
- Singleton pattern via `\J7\WpUtils\Traits\SingletonTrait`
- Class-exists guard at top of every file
- PHPCS: WordPress coding standard with many relaxed rules (short arrays OK, Yoda not required, variable naming relaxed)
- PHPStan level 6 with WooCommerce + WordPress stubs
- Tab indentation (4 spaces equivalent)
- PHP 8 features: match expressions, named arguments, null-safe operator, constructor promotion
- Typed properties and return types preferred

## TypeScript / JavaScript
- Vite + TypeScript, jQuery-based frontend (no React for frontend signing UI)
- `@/` path alias to `js/src/`
- ESLint: Airbnb + WordPress plugin rules
- Prettier: default config
- Tab indentation

## CSS
- TailwindCSS 3 with DaisyUI (prefix: `pc-`)
- SCSS for custom styles
- `tw-` prefix utilities for WordPress-conflicting classes (`tw-hidden`, `tw-fixed`, etc.)
- `cant_edit` / `can_edit` CSS classes for contract field state

## Naming
- CPT slugs: snake_case (`contract_template`, `contract`)
- PHP hooks: `power_contract_` prefix
- JS globals: `signature_pad_custom_data`
- Text domain: `power_contract`
- Settings key: `power_contract_settings`
- CSS class prefix: `pct__` for contract-specific elements

## Design Patterns
- DTO pattern for settings (SettingsDTO extends DTO)
- Shortcode system for contract template fields
- WordPress Settings API for admin options
- `admin-post.php` for contract approval actions
- `wp_ajax_` for contract creation
