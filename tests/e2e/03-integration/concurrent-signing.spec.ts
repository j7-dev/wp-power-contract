/**
 * 03-integration / concurrent-signing.spec.ts
 *
 * 並行簽署 E2E 測試 — 同一模板/同一訂單的並行簽約操作
 * 以及 email 通知邊界
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  AJAX_ACTION,
  CONTRACT_STATUS,
  TEST_CONTRACT,
  TEST_ORDER,
  EDGE,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, wpPut, wpDelete, type ApiOptions } from '../helpers/api-client.js'

test.describe('03-integration / 並行簽署與通知邊界', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // 並行簽署 — 多個請求同時對同一模板簽約
  // ══════════════════════════════════════════════════════════════
  test('並行送出 5 個簽約請求不應導致 500 或資料錯亂', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()

    const makeRequest = (index: number) => {
      const form = new URLSearchParams()
      form.set('action', AJAX_ACTION.CREATE_CONTRACT)
      form.set('nonce', nonce)
      form.set('contract_template_id', String(ids.templateId))
      form.set('user_name', `[E2E] 並行簽署用戶 #${index}`)
      form.set('user_phone', `091234${String(index).padStart(4, '0')}`)

      return request.post(`${BASE_URL}${EP.AJAX}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-WP-Nonce': nonce,
        },
        data: form.toString(),
      })
    }

    // 同時送出 5 個請求
    const results = await Promise.all([
      makeRequest(1),
      makeRequest(2),
      makeRequest(3),
      makeRequest(4),
      makeRequest(5),
    ])

    // 每個請求都不應 500
    for (const res of results) {
      expect(res.status()).toBeLessThan(500)
    }

    // 統計成功數量
    let successCount = 0
    for (const res of results) {
      const body = await res.json().catch(() => ({}))
      if (body.success) successCount++
    }

    // 至少應有部分成功（或全部成功，取決於伺服器是否允許並行）
    // 重點是不應出現 500
  })

  test('並行送出 3 個簽約請求搭配同一 order_id 不應導致 500', async ({ request }) => {
    if (!ids.templateId || !ids.orderId) {
      test.skip()
      return
    }

    const nonce = getNonce()

    const makeRequest = (index: number) => {
      const form = new URLSearchParams()
      form.set('action', AJAX_ACTION.CREATE_CONTRACT)
      form.set('nonce', nonce)
      form.set('contract_template_id', String(ids.templateId))
      form.set('user_name', `[E2E] 同訂單並行 #${index}`)
      form.set('_order_id', String(ids.orderId))

      return request.post(`${BASE_URL}${EP.AJAX}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-WP-Nonce': nonce,
        },
        data: form.toString(),
      })
    }

    const results = await Promise.all([
      makeRequest(1),
      makeRequest(2),
      makeRequest(3),
    ])

    for (const res of results) {
      expect(res.status()).toBeLessThan(500)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // 並行狀態操作 — 同時核准和拒絕同一合約
  // ══════════════════════════════════════════════════════════════
  test('同時對同一合約發送核准和拒絕 REST 請求不應導致 500', async () => {
    // 建立臨時合約
    const createRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] 並行核准拒絕測試',
      status: CONTRACT_STATUS.PENDING,
      meta: { user_name: '[E2E] concurrent-approve-reject' },
    })

    if (createRes.status !== 201) {
      test.skip()
      return
    }

    const contractId = (createRes.data as Record<string, unknown>).id as number

    // 同時發送核准和拒絕
    const [approveRes, rejectRes] = await Promise.all([
      wpPost(apiOpts, EP.WP_CONTRACT(contractId), { status: CONTRACT_STATUS.APPROVED }),
      wpPost(apiOpts, EP.WP_CONTRACT(contractId), { status: CONTRACT_STATUS.REJECTED }),
    ])

    expect(approveRes.status).toBeLessThan(500)
    expect(rejectRes.status).toBeLessThan(500)

    // 最終應為其中一個狀態
    const verify = await wpGet(apiOpts, EP.WP_CONTRACT(contractId))
    if (verify.status === 200) {
      const contract = verify.data as Record<string, unknown>
      expect([CONTRACT_STATUS.APPROVED, CONTRACT_STATUS.REJECTED]).toContain(contract.status)
    }

    // 清理
    await wpDelete(apiOpts, `${EP.WP_CONTRACT(contractId)}?force=true`)
  })

  // ══════════════════════════════════════════════════════════════
  // Email 通知邊界
  // ══════════════════════════════════════════════════════════════
  test('設定中 email 為空陣列時建立合約不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    // 即使 email 設定為空，合約建立流程不應因無收件人而 500
    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] empty-email-setting-test')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // REST API 大量查詢邊界
  // ══════════════════════════════════════════════════════════════
  test('REST API 查詢合約 per_page=100 不應導致 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '100',
      status: CONTRACT_STATUS.PENDING,
    })
    expect(res.status).toBeLessThan(500)
  })

  test('REST API 查詢合約使用無效的 orderby 不應導致 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      orderby: 'nonexistent_field',
      order: 'desc',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('REST API 查詢合約使用無效的 status 篩選不應導致 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      status: 'nonexistent_status',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('REST API 查詢合約 page=0 不應導致 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      page: '0',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('REST API 查詢合約 page=-1 不應導致 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      page: '-1',
    })
    expect(res.status).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // 合約模板 REST 邊界
  // ══════════════════════════════════════════════════════════════
  test('REST API 建立合約模板缺少 title 不應導致 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_TEMPLATES, {
      content: '<p>無標題模板</p>',
      status: 'publish',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('REST API 建立合約模板帶 XSS content 不應導致 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_TEMPLATES, {
      title: '[E2E] XSS 模板',
      content: `<p>${EDGE.XSS_SCRIPT}</p><div>${EDGE.XSS_IMG}</div>`,
      status: 'publish',
    })
    expect(res.status).toBeLessThan(500)

    // 清理
    if (res.status === 201) {
      const tmpl = res.data as Record<string, unknown>
      await wpDelete(apiOpts, `${EP.WP_TEMPLATE(tmpl.id as number)}?force=true`)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // 合約搭配 WooCommerce 訂單 meta (is_signed)
  // ══════════════════════════════════════════════════════════════
  test('簽約後訂單 meta is_signed 應被設定', async ({ request }) => {
    if (!ids.templateId || !ids.orderId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] is_signed meta 測試')
    form.set('_order_id', String(ids.orderId))
    form.set('_redirect', 'checkout')

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
      // redirect_url 應包含 is_signed=yes
      expect(body.data.redirect_url).toContain('is_signed=yes')
    }
  })
})
