# Task Completion Checklist

After completing a task, verify:

1. **PHP changes**: Run `composer lint` and `npx phpstan analyse`
2. **TS/JS changes**: Run `pnpm lint` and `pnpm build`
3. **i18n**: If user-facing strings changed, run `pnpm i18n`
4. **E2E tests**: If UI/flow changed, check if E2E tests need updating
5. **Version sync**: If releasing, run `pnpm sync:version`
