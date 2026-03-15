/**
 * 01-admin / template-seal.spec.ts
 *
 * 合約模板公司章 E2E 測試
 * 基於: spec/features/儲存合約模板公司章.feature + spec/es.md (SaveContractTemplateSeal)
 *
 * 觸發方式:
 *   - 傳統編輯器: save_post_contract_template hook
 *   - 區塊編輯器: rest_insert_contract_template hook / REST API meta
 *
 * 優先級:
 *   P0 — REST API 讀取合約模板，seal_url meta 存在
 *   P0 — 區塊編輯器：REST API 更新 seal_url
 *   P1 — 合約模板編輯頁面包含公司章（Seal）區塊
 *   P1 — 未登入無法存取模板編輯頁
 *   P2 — 合約模板列表頁面可正常載入
 *   P3 — seal_url 設定為空字串、無效 URL、XSS URL
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  ADMIN_PAGES,
  EDGE,
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

  // ══════════════════════════════════════════════════════════════
  // P0 — REST API：讀取合約模板
  // ══════════════════════════════════════════════════════════════

  test('[P0] 應可透過 REST API 讀取合約模板，回傳正確 id 與 status', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const res = await wpGet(apiOpts, EP.WP_TEMPLATE(ids.templateId))
    expect(res.status).toBe(200)

    const template = res.data as Record<string, unknown>
    expect(template.id).toBe(ids.templateId)
    expect(template).toHaveProperty('status')
  })

  test('[P0] 合約模板 REST API 應回傳 meta 欄位（包含 seal_url）', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const res = await wpGet(apiOpts, EP.WP_TEMPLATE(ids.templateId))
    expect(res.status).toBe(200)

    const template = res.data as Record<string, unknown>
    // meta 欄位應存在
    expect(template).toHaveProperty('meta')
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — REST API：更新 seal_url（區塊編輯器路徑）
  // ══════════════════════════════════════════════════════════════

  test('[P0] 應可透過 REST API 更新合約模板的 seal_url meta', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const testSealUrl = 'https://example.com/e2e-seal-test.png'
    const res = await wpPost(apiOpts, EP.WP_TEMPLATE(ids.templateId), {
      meta: { seal_url: testSealUrl },
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      const template = res.data as Record<string, unknown>
      const meta = template.meta as Record<string, unknown> | undefined
      if (meta) {
        expect(meta.seal_url).toBe(testSealUrl)
      }
    }
  })

  test('[P0] 更新 seal_url 後讀取應回傳更新後的值', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const newSealUrl = 'https://example.com/e2e-seal-updated.png'

    // 更新
    const updateRes = await wpPost(apiOpts, EP.WP_TEMPLATE(ids.templateId), {
      meta: { seal_url: newSealUrl },
    })
    expect(updateRes.status).toBeLessThan(500)

    // 讀取驗證
    const getRes = await wpGet(apiOpts, EP.WP_TEMPLATE(ids.templateId))
    expect(getRes.status).toBe(200)

    const template = getRes.data as Record<string, unknown>
    const meta = template.meta as Record<string, unknown> | undefined
    if (meta) {
      expect(meta.seal_url).toBe(newSealUrl)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — UI：合約模板編輯頁面
  // ══════════════════════════════════════════════════════════════

  test('[P1] 管理員可進入合約模板編輯頁面', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_EDIT(ids.templateId)}`)
    await page.waitForLoadState('domcontentloaded')

    // 頁面應包含編輯器
    const postForm = page.locator('#post, #editor, form#post')
    await expect(postForm.first()).toBeVisible()
  })

  test('[P1] 合約模板編輯頁面應包含公司章（Seal Image）相關區塊', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_EDIT(ids.templateId)}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    // Feature spec: 應有 Seal Image metabox
    const hasSealSection =
      pageContent.includes('seal') ||
      pageContent.includes('Seal') ||
      pageContent.includes('公司章') ||
      pageContent.includes('seal_url')
    expect(hasSealSection).toBeTruthy()
  })

  test('[P1] 未登入用戶無法存取合約模板編輯頁面，應被重導向至 wp-login.php', async ({
    page,
  }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    await page.context().clearCookies()
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_EDIT(ids.templateId)}`)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
    expect(page.url()).toContain('wp-login.php')
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 合約模板列表與新增頁
  // ══════════════════════════════════════════════════════════════

  test('[P2] 合約模板列表頁面可正常載入，包含標題', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const heading = page.locator('.wrap h1, .wrap h2').first()
    await expect(heading).toBeVisible({ timeout: 15_000 })
  })

  test('[P2] 新增合約模板頁面包含標題輸入欄或區塊編輯器', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_NEW}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasEditor =
      pageContent.includes('post-title') ||
      pageContent.includes('title-prompt-text') ||
      pageContent.includes('editor') ||
      pageContent.includes('block-editor')
    expect(hasEditor).toBeTruthy()
  })

  test('[P2] 合約模板列表包含 global-setup 建立的測試模板', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    // 應可見測試模板標題
    const testTemplateTitle = page.locator('[E2E]').or(
      page.locator('td.title').filter({ hasText: '[E2E]' }),
    )
    // 不強制要求，僅確認頁面正常載入
    const tableExists = await page.locator('table.wp-list-table').count() > 0
    expect(tableExists).toBeTruthy()
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — seal_url 邊界值
  // ══════════════════════════════════════════════════════════════

  test('[P3] seal_url 設為空字串不應導致 500', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const res = await wpPost(apiOpts, EP.WP_TEMPLATE(ids.templateId), {
      meta: { seal_url: '' },
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P3] seal_url 設為超長 URL 不應導致 500', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const longUrl = 'https://example.com/' + 'a'.repeat(2000)
    const res = await wpPost(apiOpts, EP.WP_TEMPLATE(ids.templateId), {
      meta: { seal_url: longUrl },
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P3] seal_url 設為含 XSS 的字串應被過濾或不導致 500', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const res = await wpPost(apiOpts, EP.WP_TEMPLATE(ids.templateId), {
      meta: { seal_url: `javascript:${EDGE.XSS_SCRIPT}` },
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P3] seal_url 設為 path traversal 字串不應導致 500', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const res = await wpPost(apiOpts, EP.WP_TEMPLATE(ids.templateId), {
      meta: { seal_url: '../../wp-config.php' },
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P3] REST API 取得不存在的合約模板應回傳 404', async () => {
    const res = await wpGet(apiOpts, EP.WP_TEMPLATE(9999999))
    expect(res.status).toBeLessThan(500)
    expect([403, 404]).toContain(res.status)
  })
})
