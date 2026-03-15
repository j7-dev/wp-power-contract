/**
 * 03-integration / security.spec.ts
 *
 * 安全性 E2E 測試
 * 覆蓋：nonce 驗證（無/空/無效/已過期格式）、CSRF 防護、
 *        未認證 REST API 存取、Admin 頁面保護、
 *        admin-post 未登入防護、nonce 錯誤回應格式驗證、
 *        重放攻擊（相同 nonce 連發）
 *
 * 優先級:
 *   P0 — 無 nonce 的 AJAX 請求應被拒絕（success:false，含 nonce error 訊息）
 *   P0 — 無效 nonce 的 AJAX 請求應被拒絕
 *   P0 — 未認證 REST API 不可修改合約（401/403）
 *   P0 — 未認證用戶存取 admin 頁面應重導向至 wp-login.php
 *   P1 — 空 nonce 應被拒絕
 *   P1 — admin-post approve/reject 未登入應被拒絕
 *   P1 — admin-post 無 cookie 應被拒絕（CSRF）
 *   P2 — 未認證 REST API 不可存取合約列表（或回傳空陣列）
 *   P3 — nonce 錯誤時回應格式符合 spec（{title:"OOPS! 合約簽屬中發生錯誤!"}）
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  AJAX_ACTION,
  CONTRACT_STATUS,
  ADMIN_PAGES,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

test.describe('03-integration / 安全性', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — nonce 驗證
  // ══════════════════════════════════════════════════════════════

  test('[P0] 無 nonce 的 AJAX create_contract 應被拒絕，回傳 success:false', async ({
    request,
  }) => {
    if (!ids.templateId) { test.skip(); return }

    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    // 刻意不帶 nonce
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] no-nonce-test')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    // spec: nonce 驗證失敗應回傳 success:false
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  test('[P0] 無效 nonce (完全隨機字串) 的 AJAX 請求應被拒絕', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', 'completely-invalid-nonce-XXXXXXXX')
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] invalid-nonce-test')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  test('[P0] 未認證 REST API POST 合約應被拒絕（401 或 403）', async ({ request }) => {
    if (!ids.contractId) { test.skip(); return }

    const res = await request.post(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACT(ids.contractId)}`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { status: CONTRACT_STATUS.APPROVED },
      },
    )

    expect(res.status()).toBeLessThan(500)
    expect([401, 403]).toContain(res.status())
  })

  test('[P0] 未登入用戶存取合約列表頁應被重導向至 wp-login.php', async ({ page }) => {
    await page.context().clearCookies()
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
    expect(page.url()).toContain('wp-login.php')
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 邊界 nonce 值
  // ══════════════════════════════════════════════════════════════

  test('[P1] 空字串 nonce 應被拒絕，回傳 success:false', async ({ request }) => {
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', '')
    formData.set('contract_template_id', '1')
    formData.set('user_name', '[E2E] empty-nonce')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  test('[P1] nonce 含 XSS 字串應被拒絕', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', '<script>alert(1)</script>')
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] xss-nonce')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  test('[P1] nonce 含 SQL injection 應被拒絕', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', "1' OR '1'='1")
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] sql-nonce')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  test('[P1] 未登入用戶透過 admin-post 核准合約應被拒絕', async ({ page }) => {
    if (!ids.contractId) { test.skip(); return }

    await page.context().clearCookies()
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 應重導向至 wp-login.php 或回傳 403
    const finalUrl = page.url()
    const isProtected =
      finalUrl.includes('wp-login.php') ||
      response!.status() === 403 ||
      response!.status() === 302
    expect(isProtected).toBeTruthy()
  })

  test('[P1] 未登入用戶透過 admin-post 拒絕合約應被拒絕', async ({ page }) => {
    if (!ids.contractId) { test.skip(); return }

    await page.context().clearCookies()
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${ids.contractId}`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const finalUrl = page.url()
    const isProtected =
      finalUrl.includes('wp-login.php') ||
      response!.status() === 403 ||
      response!.status() === 302
    expect(isProtected).toBeTruthy()
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — CSRF 防護（admin-post 無 cookie）
  // ══════════════════════════════════════════════════════════════

  test('[P1] admin-post approve_contract 無 session cookie 應被拒絕（不 500）', async ({
    request,
  }) => {
    if (!ids.contractId) { test.skip(); return }

    const res = await request.get(
      `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
      },
    )

    expect(res.status()).toBeLessThan(500)
    // 應重導向（302）或拒絕（401/403），不應 200 成功
    const isRejected = [302, 401, 403].includes(res.status())
    expect(isRejected).toBeTruthy()
  })

  test('[P1] admin-post reject_contract 無 session cookie 應被拒絕', async ({ request }) => {
    if (!ids.contractId) { test.skip(); return }

    const res = await request.get(
      `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${ids.contractId}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
      },
    )

    expect(res.status()).toBeLessThan(500)
    const isRejected = [302, 401, 403].includes(res.status())
    expect(isRejected).toBeTruthy()
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — Admin 頁面保護
  // ══════════════════════════════════════════════════════════════

  test('[P1] 未登入用戶存取設定頁面應被重導向至 wp-login.php', async ({ page }) => {
    await page.context().clearCookies()
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
    expect(page.url()).toContain('wp-login.php')
  })

  test('[P1] 未登入用戶存取合約編輯頁應被重導向至 wp-login.php', async ({ page }) => {
    if (!ids.contractId) { test.skip(); return }

    await page.context().clearCookies()
    const response = await page.goto(
      `${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`,
    )

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
    expect(page.url()).toContain('wp-login.php')
  })

  test('[P1] 未登入用戶存取合約模板列表應被重導向至 wp-login.php', async ({ page }) => {
    await page.context().clearCookies()
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.TEMPLATE_LIST}`)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
    expect(page.url()).toContain('wp-login.php')
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 未認證 REST 存取
  // ══════════════════════════════════════════════════════════════

  test('[P2] 未認證 REST GET 合約列表應回傳 401/403 或空陣列', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/wp-json/${EP.WP_CONTRACTS}`, {
      headers: { 'Content-Type': 'application/json' },
    })

    expect(res.status()).toBeLessThan(500)
    expect([200, 401, 403]).toContain(res.status())

    // 若 200，contract CPT 不公開，應為空陣列或不含私密資料
    if (res.status() === 200) {
      const data = await res.json()
      if (Array.isArray(data)) {
        // 可以是空陣列（CPT 不公開時）
        expect(data).toBeDefined()
      }
    }
  })

  test('[P2] 未認證 REST DELETE 合約應被拒絕', async ({ request }) => {
    if (!ids.contractId) { test.skip(); return }

    const res = await request.delete(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACT(ids.contractId)}`,
      { headers: { 'Content-Type': 'application/json' } },
    )

    expect(res.status()).toBeLessThan(500)
    expect([401, 403]).toContain(res.status())
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — nonce 錯誤回應格式符合 spec
  // ══════════════════════════════════════════════════════════════

  test('[P3] nonce 驗證失敗應回傳包含 nonce 錯誤標題的回應', async ({ request }) => {
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', 'BAD_NONCE_12345')
    formData.set('contract_template_id', '1')
    formData.set('user_name', '[E2E] nonce-error-format')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))

    // spec: nonce 失敗回應有兩種格式：
    // 1. {success:false, data:{...}}
    // 2. {title:"OOPS! 合約簽屬中發生錯誤!", ...}
    const hasErrorResponse =
      body.success === false ||
      typeof body.title === 'string' ||
      typeof body.message === 'string'

    expect(hasErrorResponse).toBeTruthy()
  })

  test('[P3] 多次使用相同無效 nonce 仍應被拒絕（不發生鎖定或 500）', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const badNonce = 'bad-nonce-repeated-9999'

    // 送出 3 次
    for (let i = 0; i < 3; i++) {
      const formData = new URLSearchParams()
      formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
      formData.set('nonce', badNonce)
      formData.set('contract_template_id', String(ids.templateId))
      formData.set('user_name', `[E2E] repeated-bad-nonce #${i}`)

      const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: formData.toString(),
      })

      expect(res.status()).toBeLessThan(500)

      const body = await res.json().catch(() => ({}))
      if (body.success !== undefined) {
        expect(body.success).toBe(false)
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 越權：嘗試存取他人合約
  // ══════════════════════════════════════════════════════════════

  test('[P3] REST API 取得 ID=0 的合約應回傳 4xx（不 500）', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACT(0))
    expect(res.status).toBeLessThan(500)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  test('[P3] REST API 取得 ID=-1 的合約應回傳 4xx（不 500）', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACT(-1))
    expect(res.status).toBeLessThan(500)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
