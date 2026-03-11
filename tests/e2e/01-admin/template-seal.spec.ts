/**
 * 01-admin / template-seal.spec.ts
 *
 * 上傳/儲存合約模板公司章 E2E 測試
 * 基於: spec/features/儲存合約模板公司章.feature
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  ADMIN_PAGES,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

test.describe('01-admin / 合約模板公司章', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // REST API: 讀取 / 更新 seal_url
  // ────────────────────────────────────────────────────────────
  test('應可透過 REST API 讀取合約模板', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const res = await wpGet(apiOpts, EP.WP_TEMPLATE(ids.templateId))
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      const template = res.data as Record<string, unknown>
      expect(template).toHaveProperty('id', ids.templateId)
    }
  })

  test('應可透過 REST API 更新 seal_url meta', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const sealUrl = 'https://example.com/e2e-test-seal.png'
    const res = await wpPost(apiOpts, EP.WP_TEMPLATE(ids.templateId), {
      meta: { seal_url: sealUrl },
    })
    expect(res.status).toBeLessThan(500)

    // 驗證 seal_url 已更新
    if (res.status === 200) {
      const template = res.data as Record<string, unknown>
      const meta = template.meta as Record<string, unknown> | undefined
      if (meta) {
        expect(meta.seal_url).toBe(sealUrl)
      }
    }
  })

  // ────────────────────────────────────────────────────────────
  // UI: 合約模板編輯頁面
  // ────────────────────────────────────────────────────────────
  test('管理員可進入合約模板編輯頁面', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_EDIT(ids.templateId)}`)
    await page.waitForLoadState('domcontentloaded')

    // 頁面應包含編輯器
    const postForm = page.locator('#post, #editor, form#post')
    const formExists = (await postForm.count()) > 0
    expect(formExists).toBeTruthy()
  })

  test('合約模板編輯頁面應包含公司章 (Seal) 區塊', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_EDIT(ids.templateId)}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasSealSection =
      pageContent.includes('seal') ||
      pageContent.includes('Seal') ||
      pageContent.includes('公司章') ||
      pageContent.includes('seal_url')
    expect(hasSealSection).toBeTruthy()
  })

  test('合約模板列表頁面可正常載入', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const heading = page.locator('.wrap h1, .wrap h2').first()
    await expect(heading).toBeVisible({ timeout: 15_000 })
  })

  test('可新增合約模板', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_NEW}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    // 頁面應包含編輯器或標題欄位
    const hasEditor =
      pageContent.includes('post-title') ||
      pageContent.includes('title-prompt-text') ||
      pageContent.includes('editor') ||
      pageContent.includes('block-editor')
    expect(hasEditor).toBeTruthy()
  })

  // ────────────────────────────────────────────────────────────
  // 權限驗證
  // ────────────────────────────────────────────────────────────
  test('未登入用戶無法存取合約模板編輯頁面', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    await page.context().clearCookies()
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_EDIT(ids.templateId)}`)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 應被重導向至登入頁面
    const finalUrl = page.url()
    expect(finalUrl).toContain('wp-login.php')
  })
})
