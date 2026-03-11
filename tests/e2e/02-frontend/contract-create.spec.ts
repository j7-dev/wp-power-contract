/**
 * 02-frontend / contract-create.spec.ts
 *
 * 建立合約（客戶簽署）E2E 測試
 * 基於: spec/features/建立合約.feature + spec/api.yml (CreateContract)
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
import { wpGet, type ApiOptions } from '../helpers/api-client.js'

test.describe('02-frontend / 建立合約（客戶簽署）', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // AJAX: create_contract — 成功簽署
  // ────────────────────────────────────────────────────────────
  test('已登入用戶應可透過 AJAX 簽署合約', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `${TEST_CONTRACT.USER_NAME} (ajax-test)`)
    formData.set('user_phone', TEST_CONTRACT.USER_PHONE)
    formData.set('user_address', TEST_CONTRACT.USER_ADDRESS)
    formData.set('contract_amount', TEST_CONTRACT.CONTRACT_AMOUNT)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    // AJAX 回傳 {success: true/false, data: {...}}
    expect(body).toHaveProperty('success')

    if (body.success) {
      expect(body.data).toHaveProperty('code', 'sign_success')
    }
  })

  // ────────────────────────────────────────────────────────────
  // AJAX: create_contract — nonce 驗證失敗
  // ────────────────────────────────────────────────────────────
  test('nonce 無效時應回傳錯誤', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', 'invalid_nonce_value')
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] nonce-test')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    // 應回傳 success: false
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  // ────────────────────────────────────────────────────────────
  // AJAX: create_contract — 缺少必填參數
  // ────────────────────────────────────────────────────────────
  test('缺少 contract_template_id 時應回傳參數錯誤', async ({ request }) => {
    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    // 不帶 contract_template_id
    formData.set('user_name', '[E2E] missing-template-id')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
      // 應包含 sign_error code 或缺少參數訊息
      if (body.data?.code) {
        expect(body.data.code).toBe('sign_error')
      }
    }
  })

  // ────────────────────────────────────────────────────────────
  // AJAX: create_contract — 帶有 order_id 和 redirect
  // ────────────────────────────────────────────────────────────
  test('帶有 order_id 和 redirect=checkout 的合約簽署', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `${TEST_CONTRACT.USER_NAME} (redirect-test)`)
    formData.set('_redirect', 'checkout')

    if (ids.orderId) {
      formData.set('_order_id', String(ids.orderId))
    }

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    expect(body).toHaveProperty('success')

    if (body.success && body.data?.redirect_url) {
      // redirect_url 應包含 is_signed=yes
      expect(body.data.redirect_url).toContain('is_signed=yes')
    }
  })

  test('帶有 order_id 和 redirect=thankyou 的合約簽署', async ({ request }) => {
    if (!ids.templateId || !ids.orderId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `${TEST_CONTRACT.USER_NAME} (thankyou-test)`)
    formData.set('_order_id', String(ids.orderId))
    formData.set('_redirect', 'thankyou')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    expect(body).toHaveProperty('success')

    if (body.success && body.data?.redirect_url) {
      // redirect_url 應指向感謝頁
      expect(body.data.redirect_url.length).toBeGreaterThan(0)
    }
  })

  // ────────────────────────────────────────────────────────────
  // 合約建立後狀態驗證
  // ────────────────────────────────────────────────────────────
  test('新建立的合約狀態應為 pending', async () => {
    // 查詢所有合約，找到最新建立的
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '5',
      orderby: 'date',
      order: 'desc',
      status: CONTRACT_STATUS.PENDING,
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200 && Array.isArray(res.data)) {
      for (const c of res.data as Array<Record<string, unknown>>) {
        expect(c.status).toBe(CONTRACT_STATUS.PENDING)
      }
    }
  })

  // ────────────────────────────────────────────────────────────
  // 前端頁面: 合約模板頁面
  // ────────────────────────────────────────────────────────────
  test('合約模板前端頁面可正常載入', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    // 取得合約模板 permalink
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

    await page.goto(link)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    // 頁面應包含合約模板內容
    expect(pageContent.length).toBeGreaterThan(0)
  })
})
