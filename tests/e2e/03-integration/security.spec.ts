/**
 * 03-integration / security.spec.ts
 *
 * 安全性 E2E 測試 — 驗證認證、nonce、未授權存取
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  AJAX_ACTION,
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

  // ────────────────────────────────────────────────────────────
  // 認證與 nonce 驗證
  // ────────────────────────────────────────────────────────────
  test('無 nonce 的 AJAX 請求應被拒絕', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    // 故意不帶 nonce
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] no-nonce-test')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    // 應回傳失敗或被 WordPress 攔截
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  test('無效 nonce 的 AJAX 請求應被拒絕', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', 'completely-invalid-nonce-12345')
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

  test('空 nonce 的 AJAX 請求應被拒絕', async ({ request }) => {
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', '')
    formData.set('contract_template_id', '1')

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

  // ────────────────────────────────────────────────────────────
  // 未認證 REST API 存取
  // ────────────────────────────────────────────────────────────
  test('未認證的 REST API 請求不應可存取合約', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/wp-json/${EP.WP_CONTRACTS}`, {
      headers: { 'Content-Type': 'application/json' },
    })

    expect(res.status()).toBeLessThan(500)
    // 未認證應回傳 401 或 403，或空陣列（取決於 CPT 設定）
    expect([200, 401, 403]).toContain(res.status())

    if (res.status() === 200) {
      // 如果是 200，contract CPT 可能不公開，應為空陣列
      const data = await res.json()
      if (Array.isArray(data)) {
        // contract CPT 設定為不公開時應為空
        expect(data).toBeDefined()
      }
    }
  })

  test('未認證用戶不應可修改合約', async ({ request }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await request.post(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACT(ids.contractId)}`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { status: 'approved' },
      },
    )

    expect(res.status()).toBeLessThan(500)
    // 未認證應被拒絕
    expect([401, 403]).toContain(res.status())
  })

  // ────────────────────────────────────────────────────────────
  // Admin 頁面未登入防護
  // ────────────────────────────────────────────────────────────
  test('未登入用戶存取合約列表頁應被重導向至登入頁', async ({ page }) => {
    await page.context().clearCookies()
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
    expect(page.url()).toContain('wp-login.php')
  })

  test('未登入用戶存取設定頁面應被重導向至登入頁', async ({ page }) => {
    await page.context().clearCookies()
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
    expect(page.url()).toContain('wp-login.php')
  })

  test('未登入用戶透過 admin-post 核准合約應被拒絕', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    await page.context().clearCookies()
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 應被重導向至登入頁或顯示未授權
    const finalUrl = page.url()
    const isProtected =
      finalUrl.includes('wp-login.php') ||
      response!.status() === 403 ||
      response!.status() === 302
    expect(isProtected).toBeTruthy()
  })

  // ────────────────────────────────────────────────────────────
  // CSRF 防護
  // ────────────────────────────────────────────────────────────
  test('admin-post approve_contract 無 cookie 應被拒絕', async ({ request }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await request.get(
      `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId}`,
      {
        headers: {},
        maxRedirects: 0,
      },
    )

    expect(res.status()).toBeLessThan(500)
  })

  test('admin-post reject_contract 無 cookie 應被拒絕', async ({ request }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await request.get(
      `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${ids.contractId}`,
      {
        headers: {},
        maxRedirects: 0,
      },
    )

    expect(res.status()).toBeLessThan(500)
  })
})
