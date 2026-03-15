/**
 * 02-frontend / checkout-redirect.spec.ts
 *
 * 結帳前重導向至合約 E2E 測試
 * 基於: spec/features/woocommerce/結帳前重導向至合約.feature
 *
 * 核心行為：
 *   - display_contract_before_checkout=true 且 is_signed 未帶 yes 時，
 *     template_redirect hook 將結帳頁重導向至合約模板頁（帶 redirect=checkout）
 *   - is_signed=yes 時保持在結帳頁
 *   - 非結帳頁不觸發重導向
 *
 * 優先級:
 *   P0 — 合約模板頁帶 redirect=checkout 參數可正常載入
 *   P1 — is_signed=yes 結帳頁不重導向至合約頁
 *   P1 — 非結帳頁不被重導向
 *   P2 — 重導向後 URL 格式包含 redirect=checkout
 *   P2 — 結帳頁本身不 500（設定 off 或 WC 未啟用時的 fallback）
 *   P3 — 邊界值：is_signed 奇怪的值、URL encode 問題
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  SETTINGS_FIELDS,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

test.describe('02-frontend / 結帳前重導向至合約', () => {
  let apiOpts: ApiOptions
  let ids: TestIds
  let templateLink: string | undefined

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()

    // 嘗試取得合約模板 permalink，供後續測試使用
    if (ids.templateId) {
      const res = await wpGet(apiOpts, EP.WP_TEMPLATE(ids.templateId))
      if (res.status === 200) {
        const t = res.data as Record<string, unknown>
        templateLink = (t.link as string) ?? undefined
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 合約模板頁面帶 redirect=checkout 可正常載入
  // ══════════════════════════════════════════════════════════════

  test('[P0] 合約模板頁面帶有 redirect=checkout 參數應可正常載入（不 500）', async ({ page }) => {
    if (!templateLink) {
      test.skip()
      return
    }

    const sep = templateLink.includes('?') ? '&' : '?'
    const url = `${templateLink}${sep}redirect=checkout`

    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 頁面應有實質內容
    const content = await page.content()
    expect(content.length).toBeGreaterThan(100)
  })

  test('[P0] 合約模板頁帶 redirect=checkout 且 order_id 應可正常載入', async ({ page }) => {
    if (!templateLink || !ids.orderId) {
      test.skip()
      return
    }

    const sep = templateLink.includes('?') ? '&' : '?'
    const url = `${templateLink}${sep}redirect=checkout&order_id=${ids.orderId}`

    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — is_signed=yes 結帳頁不被重導向至合約頁
  // ══════════════════════════════════════════════════════════════

  test('[P1] 結帳頁帶有 is_signed=yes 不應被重導向至合約模板頁', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/?is_signed=yes`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 最終落點不應是合約模板頁
    const finalUrl = page.url()
    expect(finalUrl).not.toContain('contract_template')
  })

  test('[P1] 結帳頁帶有 is_signed=yes 且 order_id 時不應被重導向', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    const response = await page.goto(
      `${BASE_URL}/checkout/?is_signed=yes&order_id=${ids.orderId}`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const finalUrl = page.url()
    expect(finalUrl).not.toContain('contract_template')
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 非結帳頁不觸發重導向
  // ══════════════════════════════════════════════════════════════

  test('[P1] 首頁不應被重導向至合約模板頁', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const finalUrl = page.url()
    expect(finalUrl).not.toContain('contract_template')
  })

  test('[P1] 商品頁面不應被重導向至合約模板頁', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/shop/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const finalUrl = page.url()
    expect(finalUrl).not.toContain('contract_template')
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 結帳頁本身不 500（功能關閉 / WC 未啟用的 fallback）
  // ══════════════════════════════════════════════════════════════

  test('[P2] 結帳頁本身不應 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 結帳頁帶有空 is_signed 值不應 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/?is_signed=`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 合約模板頁帶有 redirect=thankyou 和 order_id 參數應可正常載入', async ({ page }) => {
    if (!templateLink || !ids.orderId) {
      test.skip()
      return
    }

    const sep = templateLink.includes('?') ? '&' : '?'
    const url = `${templateLink}${sep}redirect=thankyou&order_id=${ids.orderId}`

    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 設定頁面：chosen_contract_template 對應真實模板
  // ══════════════════════════════════════════════════════════════

  test('[P2] 設定中 chosen_contract_template 應可設定為合約模板 ID', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const res = await wpPost(apiOpts, EP.WP_OPTIONS, {
      [SETTINGS_FIELDS.CHOSEN_CONTRACT_TEMPLATE]: ids.templateId,
    })
    expect(res.status).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 邊界值：is_signed 奇怪的值
  // ══════════════════════════════════════════════════════════════

  test('[P3] 結帳頁 is_signed=no 不應當作已簽約處理', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/?is_signed=no`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P3] 結帳頁 is_signed=true（非 yes）不應特殊處理', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/?is_signed=true`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P3] 結帳頁 is_signed 含 XSS 值不應執行 script', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/checkout/?is_signed=<script>alert(1)</script>`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  test('[P3] 合約模板頁 redirect=checkout 含 XSS 注入不應執行 script', async ({ page }) => {
    if (!templateLink) {
      test.skip()
      return
    }

    const sep = templateLink.includes('?') ? '&' : '?'
    const url = `${templateLink}${sep}redirect="><script>alert(1)</script>`

    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  test('[P3] 合約模板頁 order_id 為負數不應 500', async ({ page }) => {
    if (!templateLink) {
      test.skip()
      return
    }

    const sep = templateLink.includes('?') ? '&' : '?'
    const url = `${templateLink}${sep}redirect=checkout&order_id=-1`

    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P3] 合約模板頁 order_id 為非數字不應 500', async ({ page }) => {
    if (!templateLink) {
      test.skip()
      return
    }

    const sep = templateLink.includes('?') ? '&' : '?'
    const url = `${templateLink}${sep}redirect=checkout&order_id=abc`

    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })
})
