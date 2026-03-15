/**
 * 02-frontend / contract-signing-edge.spec.ts
 *
 * 前端合約簽署邊界 E2E 測試
 * 覆蓋: 空值、無效模板頁面、redirect 邊界、XSS URL 參數、MIME 類型邊界
 *
 * 優先級:
 *   P1 — 空欄位（僅帶 template_id）不應 500
 *   P1 — 各種無效/邊界的 AJAX 請求
 *   P2 — 模板頁面帶無效 URL 參數不應 500
 *   P2 — checkout/thankyou 頁面帶異常參數不應 500
 *   P3 — XSS 參數防護（頁面不執行 script）
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  AJAX_ACTION,
  TEST_CONTRACT,
  EDGE,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpDelete, type ApiOptions } from '../helpers/api-client.js'

test.describe('02-frontend / 合約簽署邊界', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — AJAX 簽署邊界：空欄位
  // ══════════════════════════════════════════════════════════════

  test('[P1] 所有欄位皆為空（僅有 template_id 和 nonce）不應導致 500', async ({
    request,
  }) => {
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

  test('[P1] 空白 user_name（純空白字串）不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', EDGE.WHITESPACE_ONLY)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('[P1] 無效 base64 簽名（非法字元）不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] invalid-base64-sig')
    form.set('signature', 'data:image/png;base64,NOT_VALID_BASE64_!!!###')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('[P1] signature 帶有非圖片 MIME 類型（text/html）不應導致 500', async ({
    request,
  }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] wrong-mime-sig')
    // HTML 內容的 base64
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

  test('[P1] 超大 screenshot（~2MB base64）不應導致 500（可能被伺服器拒絕但非 500）', async ({
    request,
  }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    // ~2MB base64（避免超出 PHP post_max_size 造成超時）
    const largeB64 = 'data:image/png;base64,' + 'A'.repeat(2 * 1024 * 1024)

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] oversized-screenshot')
    form.set('screenshot', largeB64)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
      timeout: 60_000,
    })

    // 可能被伺服器拒絕（413），但不應 500
    expect(res.status()).toBeLessThan(500)
  }, 70_000)

  test('[P1] 使用 JSON Content-Type 送 AJAX（格式不符）不應 500', async ({ request }) => {
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

  test('[P1] 空 body 送 AJAX 請求不應 500', async ({ request }) => {
    const nonce = getNonce()
    const res = await request.post(
      `${BASE_URL}${EP.AJAX}?action=${AJAX_ACTION.CREATE_CONTRACT}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-WP-Nonce': nonce,
        },
        data: '',
      },
    )

    expect(res.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 合約模板前端頁面邊界
  // ══════════════════════════════════════════════════════════════

  test('[P2] 不存在的合約模板 permalink 應回傳 4xx 而非 500', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/?contract_template=nonexistent-template-slug-e2e`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 合約模板頁面帶有無效 order_id 參數不應 500', async ({ page }) => {
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

    const sep = link.includes('?') ? '&' : '?'
    const response = await page.goto(`${link}${sep}redirect=thankyou&order_id=-1`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 合約模板頁面帶有超大 order_id 參數不應 500', async ({ page }) => {
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

    const sep = link.includes('?') ? '&' : '?'
    const response = await page.goto(`${link}${sep}redirect=checkout&order_id=${EDGE.HUGE_NUMBER}`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — checkout / thankyou 頁面邊界
  // ══════════════════════════════════════════════════════════════

  test('[P2] checkout 頁面帶有空 is_signed 值不應導致 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/?is_signed=`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] checkout 頁面帶有非法 is_signed 值（maybe）不應導致 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/?is_signed=maybe`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 感謝頁帶有非數字 order_id 不應導致 500', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/checkout/order-received/not_a_number/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 感謝頁帶有負數 order_id 不應導致 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/order-received/-1/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 感謝頁帶有超大 order_id 不應導致 500', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/checkout/order-received/${EDGE.HUGE_NUMBER}/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 我的帳號 view-order 帶有非數字 ID 不應導致 500', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/my-account/view-order/not_a_number/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — XSS 防護
  // ══════════════════════════════════════════════════════════════

  test('[P3] 合約模板頁面帶有 XSS redirect 參數，頁面不應執行 script', async ({ page }) => {
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

    const sep = link.includes('?') ? '&' : '?'
    const xssUrl = `${link}${sep}redirect="><script>alert(1)</script>`

    const response = await page.goto(xssUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 頁面 HTML 不應包含未轉義的 script
    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  test('[P3] checkout 頁面帶有 XSS is_signed 值，頁面不應執行 script', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/checkout/?is_signed=<script>alert(1)</script>`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  test('[P3] 我的帳號 view-order 帶有 XSS ID，頁面不應執行 script', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/my-account/view-order/<script>alert(1)<\/script>/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  test('[P3] checkout redirect 目標模板不存在時不應無限迴圈（30 秒內完成）', async ({
    page,
  }) => {
    const response = await page.goto(`${BASE_URL}/checkout/`, {
      timeout: 30_000,
    })
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const url = page.url()
    expect(url.length).toBeGreaterThan(0)
  })
})
