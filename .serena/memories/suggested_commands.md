# Suggested Commands

## Development
```bash
pnpm dev          # Start Vite dev server (port 5173)
pnpm build        # Build frontend assets to js/dist/
composer install  # Install PHP dependencies
```

## Quality Assurance
```bash
composer lint                # Run PHPCS
pnpm lint                    # Run ESLint + PHPCS
pnpm lint:fix                # Auto-fix ESLint issues + PHPCS
pnpm format                  # Prettier format TSX files
npx phpstan analyse          # PHPStan level 6 analysis
```

## E2E Testing
```bash
npx wp-env start             # Start WordPress test environment (port 8892)
npx wp-env stop              # Stop test environment
cd tests/e2e && npx playwright test  # Run E2E tests
```

## Release
```bash
pnpm release                 # Patch release (via release-it)
pnpm release:minor           # Minor release
pnpm release:major           # Major release
pnpm zip                     # Create distribution ZIP
pnpm sync:version            # Sync version from package.json to plugin.php
```

## i18n
```bash
pnpm i18n                    # Generate .pot file
pnpm i18n:commit             # Generate .pot + amend to last commit
```

## System Utilities (Windows)
```bash
git status / git log / git diff   # Version control
ls / dir                          # List files
cd                                # Change directory
grep / findstr                    # Search in files
```
