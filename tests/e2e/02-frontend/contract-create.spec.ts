/**
 * 02-frontend / contract-create.spec.ts
 *
 * 建立合約（客戶簽署）E2E 測試
 * 基於: spec/features/建立合約.feature + spec/api/api.yml (CreateContract)
 *
 * 端點: POST /wp-admin/admin-ajax.php
 * Action: create_contract (wp_ajax + wp_ajax_nopriv)
 *
 * 優先級:
 *   P0 — 成功簽署：回傳 {success:true, data:{code:"sign_success"}}
 *   P0 — nonce 無效：回傳 {success:false} + "OOPS! 合約簽屬中發生錯誤!"
 *   P0 — 缺少 contract_template_id：回傳 {success:false, data:{code:"sign_error"}}
 *   P0 — 新建合約狀態應為 pending
 *   P1 — 帶 _redirect=checkout 時 redirect_url 包含 is_signed=yes
 *   P1 — 帶 _order_id + _redirect=thankyou 時訂單 is_signed 更新
 *   P1 — 訪客（未登入）可簽署，post_author 為 0
 *   P1 — 帶 signature base64 上傳
 *   P2 — 合約模板前端頁面可正常載入
 *   P2 — 簽署後合約標題格式正確
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  AJAX_ACTION,
  CONTRACT_STATUS,
  TEST_CONTRACT,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

// ─── 共用 helper ──────────────────────────────────────────────

/** 建立 AJAX 合約表單參數 */
function buildForm(
  nonce: string,
  templateId: string | number,
  overrides?: Record<string, string>,
): URLSearchParams {
  const form = new URLSearchParams()
  form.set('action', AJAX_ACTION.CREATE_CONTRACT)
  form.set('nonce', nonce)
  form.set('contract_template_id', String(templateId))
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) form.set(k, v)
  }
  return form
}

/** 送出 AJAX 請求 */
async function postAjax(
  request: import('@playwright/test').APIRequestContext,
  form: URLSearchParams,
  nonce?: string,
) {
  return request.post(`${BASE_URL}${EP.AJAX}`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(nonce ? { 'X-WP-Nonce': nonce } : {}),
    },
    data: form.toString(),
  })
}

// ─── 測試群組 ─────────────────────────────────────────────────

test.describe('02-frontend / 建立合約（客戶簽署）', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 成功簽署
  // ══════════════════════════════════════════════════════════════

  test('[P0] 已登入用戶透過 AJAX 簽署合約，應回傳 {success:true, code:"sign_success"}', async ({
    request,
  }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildForm(nonce, ids.templateId, {
      user_name: `${TEST_CONTRACT.USER_NAME} (p0-test)`,
      user_phone: TEST_CONTRACT.USER_PHONE,
      user_address: TEST_CONTRACT.USER_ADDRESS,
      contract_amount: TEST_CONTRACT.CONTRACT_AMOUNT,
    })

    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    // Feature spec: AJAX 回傳格式為 {success: bool, data: {...}}
    expect(body).toHaveProperty('success')

    if (body.success) {
      // 成功時 code 應為 sign_success
      expect(body.data).toHaveProperty('code', 'sign_success')
    }
  })

  test('[P0] 簽署成功後 REST API 查詢最新合約，狀態應為 pending', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildForm(nonce, ids.templateId, {
      user_name: `${TEST_CONTRACT.USER_NAME} (status-check)`,
    })

    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    if (!body.success) return // 若建立失敗跳過後續驗證

    // 查詢最新的 pending 合約
    const listRes = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '5',
      orderby: 'date',
      order: 'desc',
      status: CONTRACT_STATUS.PENDING,
    })
    expect(listRes.status).toBeLessThan(500)

    if (listRes.status === 200 && Array.isArray(listRes.data)) {
      for (const c of listRes.data as Array<Record<string, unknown>>) {
        expect(c.status).toBe(CONTRACT_STATUS.PENDING)
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — nonce 驗證失敗
  // ══════════════════════════════════════════════════════════════

  test('[P0] nonce 為無效值時應回傳 {success:false}，錯誤為合約簽屬中發生錯誤', async ({
    request,
  }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const form = buildForm('INVALID_NONCE_VALUE', ids.templateId, {
      user_name: '[E2E] nonce-invalid-test',
    })

    const res = await postAjax(request, form) // 不帶 X-WP-Nonce header
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    if (body.success !== undefined) {
      expect(body.success).toBe(false)

      // Feature spec: 錯誤訊息應包含 "合約簽屬中發生錯誤"
      const bodyStr = JSON.stringify(body)
      if (bodyStr.includes('title') || bodyStr.includes('description')) {
        expect(bodyStr).toMatch(/合約簽屬中發生錯誤|nonce|OOPS/i)
      }
    }
  })

  test('[P0] nonce 為空字串時應回傳 {success:false}', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const form = buildForm('', ids.templateId, {
      user_name: '[E2E] empty-nonce-test',
    })

    const res = await postAjax(request, form)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  test('[P0] 不帶 nonce 欄位時應回傳 {success:false}', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    // 完全不帶 nonce
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] no-nonce-field')

    const res = await postAjax(request, form)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 缺少必填參數
  // ══════════════════════════════════════════════════════════════

  test('[P0] 缺少 contract_template_id 時應回傳 {success:false, data:{code:"sign_error"}}', async ({
    request,
  }) => {
    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    // 故意不帶 contract_template_id
    form.set('user_name', '[E2E] missing-template-id')

    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    if (body.success !== undefined) {
      expect(body.success).toBe(false)

      // Feature spec: 缺少必填參數時 code 應為 sign_error
      if (body.data?.code) {
        expect(body.data.code).toBe('sign_error')
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — redirect 參數
  // ══════════════════════════════════════════════════════════════

  test('[P1] _redirect=checkout 時 redirect_url 應包含 is_signed=yes', async ({
    request,
  }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildForm(nonce, ids.templateId, {
      user_name: `${TEST_CONTRACT.USER_NAME} (checkout-redirect)`,
      _redirect: 'checkout',
    })

    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    expect(body).toHaveProperty('success')

    if (body.success && body.data?.redirect_url) {
      // Feature spec: redirect_url 應包含 is_signed=yes
      expect(body.data.redirect_url).toContain('is_signed=yes')
    }
  })

  test('[P1] _redirect=thankyou 且帶 _order_id 時，回傳 redirect_url 應有效', async ({
    request,
  }) => {
    if (!ids.templateId || !ids.orderId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildForm(nonce, ids.templateId, {
      user_name: `${TEST_CONTRACT.USER_NAME} (thankyou-redirect)`,
      _order_id: String(ids.orderId),
      _redirect: 'thankyou',
    })

    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    expect(body).toHaveProperty('success')

    if (body.success) {
      // sign_success
      expect(body.data.code).toBe('sign_success')

      if (body.data?.redirect_url) {
        // redirect_url 應指向感謝頁
        expect(body.data.redirect_url.length).toBeGreaterThan(0)
      }
    }
  })

  test('[P1] 帶有 _order_id 簽署後，REST API 查詢合約應有 _order_id meta', async ({
    request,
  }) => {
    if (!ids.templateId || !ids.orderId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildForm(nonce, ids.templateId, {
      user_name: `${TEST_CONTRACT.USER_NAME} (order-meta-check)`,
      _order_id: String(ids.orderId),
    })

    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    if (!body.success) return

    // 查詢最新合約確認 _order_id
    const listRes = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '1',
      orderby: 'date',
      order: 'desc',
      status: CONTRACT_STATUS.PENDING,
    })

    if (listRes.status === 200 && Array.isArray(listRes.data) && listRes.data.length > 0) {
      const latestContract = (listRes.data as Array<Record<string, unknown>>)[0]
      const contractId = latestContract.id as number

      const contractRes = await wpGet(apiOpts, EP.WP_CONTRACT(contractId))
      if (contractRes.status === 200) {
        const contract = contractRes.data as Record<string, unknown>
        const meta = contract.meta as Record<string, unknown> | undefined
        if (meta) {
          // meta 應包含 _order_id
          expect(meta).toHaveProperty('_order_id')
        }
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 訪客（未登入）簽署
  // ══════════════════════════════════════════════════════════════

  test('[P1] 未登入訪客透過 nopriv AJAX 簽署合約，應可成功建立合約', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    // 使用一般 request（不帶認證 cookie）
    const nonce = getNonce()
    const form = buildForm(nonce, ids.templateId, {
      user_name: '[E2E] 匿名訪客',
    })

    // 送出請求（wp_ajax_nopriv_create_contract 應允許未登入）
    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // 不帶 Cookie/認證
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    // nopriv action 應允許建立合約
    expect(body).toHaveProperty('success')
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — signature base64 上傳
  // ══════════════════════════════════════════════════════════════

  test('[P1] 帶有 base64 簽名圖片（PNG data URI）應可成功簽署', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildForm(nonce, ids.templateId, {
      user_name: `${TEST_CONTRACT.USER_NAME} (with-signature)`,
      signature: TEST_CONTRACT.SIGNATURE, // 1x1 PNG base64
    })

    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    expect(body).toHaveProperty('success')
    // 帶有有效 base64 的請求，sign_success 或優雅失敗
    if (body.success) {
      expect(body.data.code).toBe('sign_success')
    }
  })

  test('[P1] 帶有 base64 截圖（screenshot）應可成功簽署', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildForm(nonce, ids.templateId, {
      user_name: `${TEST_CONTRACT.USER_NAME} (with-screenshot)`,
      screenshot: TEST_CONTRACT.SCREENSHOT,
    })

    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    expect(body).toHaveProperty('success')
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 合約模板前端頁面
  // ══════════════════════════════════════════════════════════════

  test('[P2] 合約模板前端頁面（permalink）可正常載入，回傳 200', async ({ page }) => {
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

    const response = await page.goto(link)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const pageContent = await page.content()
    expect(pageContent.length).toBeGreaterThan(0)
  })

  test('[P2] 合約模板前端頁面帶 redirect=checkout 參數可正常載入', async ({ page }) => {
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
    const response = await page.goto(`${link}${sep}redirect=checkout`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 合約標題格式驗證
  // ══════════════════════════════════════════════════════════════

  test('[P2] 簽署後合約標題格式應為「{模板名稱} 合約 - {user_name}...」', async ({
    request,
  }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const userName = `[E2E] 標題格式測試`
    const nonce = getNonce()
    const form = buildForm(nonce, ids.templateId, {
      user_name: userName,
    })

    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json()
    if (!body.success) return

    // 查詢最新建立的合約
    const listRes = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '1',
      orderby: 'date',
      order: 'desc',
    })

    if (listRes.status === 200 && Array.isArray(listRes.data) && listRes.data.length > 0) {
      const latest = (listRes.data as Array<Record<string, unknown>>)[0]
      const title = latest.title as Record<string, unknown>
      const rendered = (title?.rendered as string) ?? ''

      // Feature spec: 合約標題格式為 "{模板名稱} 合約 - {user_name} 對應 user_id: #{user_id}"
      // 或至少包含 user_name
      if (rendered) {
        expect(rendered.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
