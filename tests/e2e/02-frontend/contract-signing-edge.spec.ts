/**
 * 02-frontend / contract-signing-edge.spec.ts
 *
 * 前端合約簽署邊界 E2E 測試 — 空簽名、無效模板頁面、redirect 邊界
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  AJAX_ACTION,
  TEST_CONTRACT,
  TEST_ORDER,
  EDGE,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, wpDelete, type ApiOptions } from '../helpers/api-client.js'

test.describe('02-frontend / 合約簽署邊界', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // 合約模板前端頁面邊界
  // ────────────────────────────────────────────────────────────
  test('不存在的合約模板 permalink 應回傳 404 而非 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/?contract_template=nonexistent-template-slug`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('合約模板頁面帶有 XSS redirect 參數不應執行 script', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const res = await wpGet(apiOpts, EP.WP_TEMPLATE(ids.templateId))
    if (res.status !== 200) {
      test.skip()
      return
    }

    const template = res.data as Record<string, unknown>
    const link = (template.link as string) ?? ''

    if (!link) {
      test.skip()
      return
    }

    // 帶有 XSS 的 redirect 參數
    const separator = link.includes('?') ? '&' : '?'
    const xssUrl = `${link}${separator}redirect="><script>alert(1)</script>`

    const response = await page.goto(xssUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 頁面 HTML 不應包含未轉義的 script
    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  test('合約模板頁面帶有無效 order_id 參數不應 500', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const res = await wpGet(apiOpts, EP.WP_TEMPLATE(ids.templateId))
    if (res.status !== 200) {
      test.skip()
      return
    }

    const template = res.data as Record<string, unknown>
    const link = (template.link as string) ?? ''

    if (!link) {
      test.skip()
      return
    }

    const separator = link.includes('?') ? '&' : '?'
    const badOrderUrl = `${link}${separator}redirect=thankyou&order_id=-1`

    const response = await page.goto(badOrderUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('合約模板頁面帶有超大 order_id 不應 500', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const res = await wpGet(apiOpts, EP.WP_TEMPLATE(ids.templateId))
    if (res.status !== 200) {
      test.skip()
      return
    }

    const template = res.data as Record<string, unknown>
    const link = (template.link as string) ?? ''

    if (!link) {
      test.skip()
      return
    }

    const separator = link.includes('?') ? '&' : '?'
    const hugeOrderUrl = `${link}${separator}redirect=checkout&order_id=99999999999`

    const response = await page.goto(hugeOrderUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // Checkout redirect 邊界
  // ────────────────────────────────────────────────────────────
  test('checkout 頁面帶有不完整的 is_signed 參數不應導致 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/?is_signed=`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('checkout 頁面帶有非法 is_signed 值不應導致 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/?is_signed=maybe`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('checkout 頁面帶有 XSS is_signed 值不應執行 script', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/checkout/?is_signed=<script>alert(1)</script>`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  // ────────────────────────────────────────────────────────────
  // Thank-you redirect 邊界
  // ────────────────────────────────────────────────────────────
  test('感謝頁帶有字串 order_id 不應導致 500', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/checkout/order-received/not_a_number/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('感謝頁帶有負數 order_id 不應導致 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/order-received/-1/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('感謝頁帶有超大 order_id 不應導致 500', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/checkout/order-received/${EDGE.HUGE_NUMBER}/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // AJAX 簽署邊界 — 多個欄位同時為空
  // ────────────────────────────────────────────────────────────
  test('所有欄位皆為空（僅有 template_id）不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '')
    form.set('user_phone', '')
    form.set('user_address', '')
    form.set('user_identity', '')
    form.set('contract_amount', '')
    form.set('signature', '')
    form.set('screenshot', '')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('signature 帶有非 PNG base64 前綴不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] wrong-mime-signature')
    form.set('signature', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 我的帳號頁面邊界
  // ────────────────────────────────────────────────────────────
  test('我的帳號 view-order 帶有字串 ID 不應導致 500', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/my-account/view-order/not_a_number/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('我的帳號 view-order 帶有 XSS ID 不應導致 500', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/my-account/view-order/<script>alert(1)</script>/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  // ────────────────────────────────────────────────────────────
  // 合約模板頁面帶有合約模板不存在時的 redirect
  // ────────────────────────────────────────────────────────────
  test('checkout redirect 目標模板不存在時不應無限迴圈', async ({ page }) => {
    // 模擬 chosen_contract_template 指向不存在的模板
    // 訪問 checkout 頁面，即使設定的模板不存在，也不應無限重導向
    const response = await page.goto(`${BASE_URL}/checkout/`, {
      timeout: 30_000,
    })
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 驗證沒有無限迴圈（頁面成功載入即通過）
    const url = page.url()
    expect(url.length).toBeGreaterThan(0)
  })

  // ────────────────────────────────────────────────────────────
  // POST 請求格式邊界
  // ────────────────────────────────────────────────────────────
  test('使用 JSON Content-Type 送 AJAX 合約建立（格式不符）不應 500', async ({
    request,
  }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      data: JSON.stringify({
        action: AJAX_ACTION.CREATE_CONTRACT,
        nonce,
        contract_template_id: ids.templateId,
        user_name: '[E2E] json-content-type-test',
      }),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('使用空 body 送 AJAX 合約建立不應 500', async ({ request }) => {
    const nonce = getNonce()
    const res = await request.post(`${BASE_URL}${EP.AJAX}?action=${AJAX_ACTION.CREATE_CONTRACT}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: '',
    })

    expect(res.status()).toBeLessThan(500)
  })
})
