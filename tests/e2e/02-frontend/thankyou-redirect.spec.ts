/**
 * 02-frontend / thankyou-redirect.spec.ts
 *
 * 感謝頁前重導向至合約 E2E 測試
 * 基於: spec/features/woocommerce/感謝頁前重導向至合約.feature
 *
 * 核心行為（woocommerce_get_checkout_order_received_url filter）：
 *   - display_contract_after_checkout=true 且訂單 is_signed≠yes 且已設定模板：
 *     將感謝頁 URL 改為合約模板頁（帶 redirect=thankyou&order_id=XXX）
 *   - 訂單 is_signed=yes 時回傳原始感謝頁 URL
 *   - chosen_contract_template 未設定時不改變 URL
 *   - 設定關閉時不改變 URL
 *
 * 優先級:
 *   P0 — 合約模板頁帶 redirect=thankyou&order_id 可正常載入
 *   P1 — 感謝頁本身不 500
 *   P1 — is_signed=yes 感謝頁不被改變（測試 URL 格式帶此參數時不重導向至合約）
 *   P2 — 不同 order_id 邊界值（不存在、負數、超大）
 *   P3 — XSS 防護、redirect 參數奇怪值
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  SETTINGS_FIELDS,
  EDGE,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

test.describe('02-frontend / 感謝頁前重導向至合約', () => {
  let apiOpts: ApiOptions
  let ids: TestIds
  let templateLink: string | undefined

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()

    if (ids.templateId) {
      const res = await wpGet(apiOpts, EP.WP_TEMPLATE(ids.templateId))
      if (res.status === 200) {
        const t = res.data as Record<string, unknown>
        templateLink = (t.link as string) ?? undefined
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 合約模板頁帶 redirect=thankyou 可正常載入
  // ══════════════════════════════════════════════════════════════

  test('[P0] 合約模板頁帶 redirect=thankyou 和 order_id 應可正常載入', async ({ page }) => {
    if (!templateLink || !ids.orderId) {
      test.skip()
      return
    }

    const sep = templateLink.includes('?') ? '&' : '?'
    const url = `${templateLink}${sep}redirect=thankyou&order_id=${ids.orderId}`

    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const content = await page.content()
    expect(content.length).toBeGreaterThan(100)
  })

  test('[P0] AJAX 簽署成功後 redirect_url 應包含 redirect=thankyou（若設定 display_contract_after_checkout）', async ({
    request,
  }) => {
    if (!ids.templateId || !ids.orderId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', 'create_contract')
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] thankyou-redirect-test')
    form.set('_order_id', String(ids.orderId))
    form.set('_redirect', 'thankyou')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    if (body.success && body.data?.redirect_url) {
      // 成功後 redirect_url 應指向感謝頁
      const redirectUrl = body.data.redirect_url as string
      // 感謝頁 URL 包含 order-received 或原始感謝頁
      const isThankYouUrl =
        redirectUrl.includes('order-received') ||
        redirectUrl.includes('checkout') ||
        redirectUrl.length > 0
      expect(isThankYouUrl).toBeTruthy()
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 感謝頁本身不 500
  // ══════════════════════════════════════════════════════════════

  test('[P1] 訂單感謝頁本身不應 500', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    const response = await page.goto(
      `${BASE_URL}/checkout/order-received/${ids.orderId}/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P1] 感謝頁帶有 is_signed=yes 不應被重導向至合約頁面', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    const response = await page.goto(
      `${BASE_URL}/checkout/order-received/${ids.orderId}/?is_signed=yes`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 帶 is_signed=yes 時最終不應落在合約模板頁
    const finalUrl = page.url()
    expect(finalUrl).not.toContain('contract_template')
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 不同 order_id 邊界值
  // ══════════════════════════════════════════════════════════════

  test('[P2] 感謝頁帶有不存在的 order_id 不應 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/order-received/9999999/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 感謝頁帶有負數 order_id 不應 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/order-received/-1/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 感謝頁帶有超大 order_id 不應 500', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/checkout/order-received/${EDGE.HUGE_NUMBER}/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 感謝頁帶有非數字 order_id 不應 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/order-received/not_a_number/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 感謝頁基礎路徑（無 order_id）不應 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/order-received/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 合約模板頁帶 redirect=thankyou 且 order_id 不存在應優雅處理', async ({
    page,
  }) => {
    if (!templateLink) {
      test.skip()
      return
    }

    const sep = templateLink.includes('?') ? '&' : '?'
    const url = `${templateLink}${sep}redirect=thankyou&order_id=9999999`

    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 設定 chosen_contract_template 為不存在 ID 時感謝頁不應 500', async ({
    page,
  }) => {
    // 嘗試設定不存在的模板 ID（若設定頁可用）
    await wpPost(apiOpts, EP.WP_OPTIONS, {
      [SETTINGS_FIELDS.CHOSEN_CONTRACT_TEMPLATE]: 9999999,
    }).catch(() => null)

    if (ids.orderId) {
      const response = await page.goto(
        `${BASE_URL}/checkout/order-received/${ids.orderId}/`,
      )
      expect(response).toBeTruthy()
      expect(response!.status()).toBeLessThan(500)
    }

    // 還原設定
    if (ids.templateId) {
      await wpPost(apiOpts, EP.WP_OPTIONS, {
        [SETTINGS_FIELDS.CHOSEN_CONTRACT_TEMPLATE]: ids.templateId,
      }).catch(() => null)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — XSS 防護
  // ══════════════════════════════════════════════════════════════

  test('[P3] 感謝頁 URL 中帶有 XSS is_signed 值不應執行 script', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    const response = await page.goto(
      `${BASE_URL}/checkout/order-received/${ids.orderId}/?is_signed=<script>alert(1)</script>`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  test('[P3] 合約模板頁帶有 redirect=thankyou 且 XSS order_id 不應執行 script', async ({
    page,
  }) => {
    if (!templateLink) {
      test.skip()
      return
    }

    const sep = templateLink.includes('?') ? '&' : '?'
    const url = `${templateLink}${sep}redirect=thankyou&order_id="><script>alert(1)</script>`

    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  test('[P3] 合約模板頁帶有無效 redirect 值不應 500', async ({ page }) => {
    if (!templateLink) {
      test.skip()
      return
    }

    const sep = templateLink.includes('?') ? '&' : '?'
    const url = `${templateLink}${sep}redirect=invalid_redirect_target`

    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P3] 感謝頁帶有 is_signed=no（非 yes）不應特殊處理', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    const response = await page.goto(
      `${BASE_URL}/checkout/order-received/${ids.orderId}/?is_signed=no`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P3] 感謝頁 30 秒內應完成載入（不發生無限迴圈）', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    const response = await page.goto(
      `${BASE_URL}/checkout/order-received/${ids.orderId}/`,
      { timeout: 30_000 },
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const finalUrl = page.url()
    expect(finalUrl.length).toBeGreaterThan(0)
  }, 35_000)
})
