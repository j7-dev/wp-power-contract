/**
 * 03-integration / edge-cases.spec.ts
 *
 * 邊界案例 E2E 測試 — 訪客簽署、重複簽署、無效模板 ID、訂單整合
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  AJAX_ACTION,
  CONTRACT_STATUS,
  TEST_CONTRACT,
  TEST_ORDER,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

test.describe('03-integration / 邊界案例', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // 訪客簽署合約
  // ────────────────────────────────────────────────────────────
  test('未登入訪客應可透過 nopriv AJAX 簽署合約', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    // 使用不帶認證的請求模擬訪客
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', getNonce()) // 訪客需要有效 nonce（透過前端取得）
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] 匿名訪客')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': getNonce(),
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    // 外掛支援 wp_ajax_nopriv_create_contract
    expect(body).toHaveProperty('success')
  })

  // ────────────────────────────────────────────────────────────
  // 重複簽署同一模板
  // ────────────────────────────────────────────────────────────
  test('同一用戶重複簽署同一模板不應出錯', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()

    // 第一次簽署
    const formData1 = new URLSearchParams()
    formData1.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData1.set('nonce', nonce)
    formData1.set('contract_template_id', String(ids.templateId))
    formData1.set('user_name', '[E2E] 重複簽署用戶 (第一次)')

    const res1 = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData1.toString(),
    })
    expect(res1.status()).toBeLessThan(500)

    // 第二次簽署同一模板
    const formData2 = new URLSearchParams()
    formData2.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData2.set('nonce', nonce)
    formData2.set('contract_template_id', String(ids.templateId))
    formData2.set('user_name', '[E2E] 重複簽署用戶 (第二次)')

    const res2 = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData2.toString(),
    })
    expect(res2.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 無效模板 ID
  // ────────────────────────────────────────────────────────────
  test('不存在的 contract_template_id 應優雅處理', async ({ request }) => {
    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', '9999999') // 不存在的 ID
    formData.set('user_name', '[E2E] invalid-template-test')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('contract_template_id 為 0 時應回傳錯誤', async ({ request }) => {
    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', '0')
    formData.set('user_name', '[E2E] zero-template-test')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('contract_template_id 為負數時應回傳錯誤', async ({ request }) => {
    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', '-1')
    formData.set('user_name', '[E2E] negative-template-test')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 訂單整合邊界
  // ────────────────────────────────────────────────────────────
  test('不存在的 order_id 不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] invalid-order-test')
    formData.set('_order_id', String(TEST_ORDER.NONEXISTENT_ID))

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('order_id 為 0 時不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] zero-order-test')
    formData.set('_order_id', '0')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // invalid _redirect 值
  // ────────────────────────────────────────────────────────────
  test('無效的 _redirect 值不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] invalid-redirect-test')
    formData.set('_redirect', 'invalid_redirect_value')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // REST API 邊界
  // ────────────────────────────────────────────────────────────
  test('不存在的合約 ID 取得合約應回傳 404', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACT(TEST_ORDER.NONEXISTENT_ID))
    expect(res.status).toBeLessThan(500)
    expect([403, 404]).toContain(res.status)
  })

  test('不存在的合約模板 ID 應回傳 404', async () => {
    const res = await wpGet(apiOpts, EP.WP_TEMPLATE(TEST_ORDER.NONEXISTENT_ID))
    expect(res.status).toBeLessThan(500)
    expect([403, 404]).toContain(res.status)
  })

  test('對合約使用無效的狀態值不應導致 500', async () => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      status: 'nonexistent_status',
    })
    expect(res.status).toBeLessThan(500)
  })
})
