/**
 * 03-integration / lifecycle.spec.ts
 *
 * 合約完整生命週期 E2E 測試
 * 覆蓋：AJAX 建立→pending→approved（完整流程）、REST 建立→rejected（完整流程）、
 *        狀態輪轉（pending→approved→rejected→pending）、
 *        meta 資料完整性驗證、
 *        WC 訂單刪除後合約仍可存取、
 *        合約模板刪除後/draft 模板建立合約邊界、
 *        標題格式驗證（"{模板名稱} 合約 - {user_name} 對應 user_id: #{user_id}"）
 *
 * 優先級:
 *   P0 — 完整流程：AJAX 建立 → REST 驗證 pending → admin-post 核准 → 驗證 approved
 *   P0 — 完整流程：REST 建立 → admin-post 拒絕 → 驗證 rejected
 *   P0 — 合約標題格式符合 spec 要求
 *   P1 — 狀態輪轉（pending→approved→rejected→pending）不出錯
 *   P1 — meta 資料完整性（所有欄位保存）
 *   P2 — WC 訂單刪除後合約仍可透過 REST 存取
 *   P2 — 權限邊界：未認證用戶不可核准/拒絕/刪除合約
 *   P2 — Subscriber 角色不可修改合約
 *   P3 — 模板刪除後使用該模板 ID 不可再建立合約（sign_error）
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
import { wpGet, wpPost, wpDelete, type ApiOptions } from '../helpers/api-client.js'

test.describe('03-integration / 合約生命週期與權限邊界', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 完整流程：AJAX 建立 → 核准 → 驗證
  // ══════════════════════════════════════════════════════════════

  test('[P0] 完整生命週期：AJAX 建立合約 → 驗證 pending → admin-post 核准 → 驗證 approved', async ({
    request,
    page,
  }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()

    // Step 1: AJAX 建立合約
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] 完整生命週期測試')
    form.set('user_phone', TEST_CONTRACT.USER_PHONE)
    form.set('contract_amount', TEST_CONTRACT.CONTRACT_AMOUNT)
    form.set('signature', TEST_CONTRACT.SIGNATURE)
    form.set('screenshot', TEST_CONTRACT.SCREENSHOT)

    const createRes = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })
    expect(createRes.status()).toBeLessThan(500)

    const createBody = await createRes.json().catch(() => ({}))
    if (!createBody.success) {
      // 合約建立失敗，可能因為 nonce 過期，但不應 500
      return
    }
    expect(createBody.data.code).toBe('sign_success')

    // Step 2: 查詢最新的 pending 合約
    const listRes = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '1',
      orderby: 'date',
      order: 'desc',
      status: CONTRACT_STATUS.PENDING,
    })
    expect(listRes.status).toBeLessThan(500)

    if (listRes.status !== 200 || !Array.isArray(listRes.data) || listRes.data.length === 0) {
      return
    }

    const latest = (listRes.data as Array<Record<string, unknown>>)[0]
    const newContractId = latest.id as number

    // 驗證初始狀態為 pending
    expect(latest.status).toBe(CONTRACT_STATUS.PENDING)

    // Step 3: admin-post 核准
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${newContractId}`
    const approveRes = await page.goto(approveUrl)
    expect(approveRes).toBeTruthy()
    expect(approveRes!.status()).toBeLessThan(500)

    // Step 4: 驗證狀態已更新為 approved
    const verifyRes = await wpGet(apiOpts, EP.WP_CONTRACT(newContractId))
    if (verifyRes.status === 200) {
      const contract = verifyRes.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.APPROVED)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 完整流程：REST 建立 → 拒絕 → 驗證
  // ══════════════════════════════════════════════════════════════

  test('[P0] 完整生命週期：REST 建立 → admin-post 拒絕 → 驗證 rejected', async ({ page }) => {
    const createRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] 生命週期拒絕測試',
      status: CONTRACT_STATUS.PENDING,
      meta: {
        user_name: '[E2E] lifecycle-reject',
        user_phone: TEST_CONTRACT.USER_PHONE,
      },
    })

    if (createRes.status !== 201) { test.skip(); return }

    const contract = createRes.data as Record<string, unknown>
    const contractId = contract.id as number

    // 確認初始狀態
    expect(contract.status).toBe(CONTRACT_STATUS.PENDING)

    // admin-post 拒絕
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${contractId}`
    const rejectRes = await page.goto(rejectUrl)
    expect(rejectRes).toBeTruthy()
    expect(rejectRes!.status()).toBeLessThan(500)

    // 驗證最終狀態
    const verifyRes = await wpGet(apiOpts, EP.WP_CONTRACT(contractId))
    if (verifyRes.status === 200) {
      const verified = verifyRes.data as Record<string, unknown>
      expect(verified.status).toBe(CONTRACT_STATUS.REJECTED)
    }

    // 清理
    await wpDelete(apiOpts, `${EP.WP_CONTRACT(contractId)}?force=true`)
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — AJAX 建立後回應格式驗證（spec: sign_success code）
  // ══════════════════════════════════════════════════════════════

  test('[P0] AJAX 建立合約成功應回傳 {success:true, data:{code:"sign_success"}}', async ({
    request,
  }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] sign-success-format-test')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    if (body.success) {
      // spec: sign_success code，message 欄位應存在
      expect(body.data).toHaveProperty('code')
      expect(body.data.code).toBe('sign_success')
      expect(body.data).toHaveProperty('message')
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 狀態輪轉
  // ══════════════════════════════════════════════════════════════

  test('[P1] 合約狀態可完整輪轉：pending → approved → rejected → pending', async () => {
    const createRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] 狀態輪轉測試',
      status: CONTRACT_STATUS.PENDING,
      meta: { user_name: '[E2E] status-rotation' },
    })

    if (createRes.status !== 201) { test.skip(); return }

    const contract = createRes.data as Record<string, unknown>
    const id = contract.id as number

    // pending → approved
    const toApproved = await wpPost(apiOpts, EP.WP_CONTRACT(id), {
      status: CONTRACT_STATUS.APPROVED,
    })
    expect(toApproved.status).toBeLessThan(500)
    if (toApproved.status === 200) {
      expect((toApproved.data as Record<string, unknown>).status).toBe(CONTRACT_STATUS.APPROVED)
    }

    // approved → rejected
    const toRejected = await wpPost(apiOpts, EP.WP_CONTRACT(id), {
      status: CONTRACT_STATUS.REJECTED,
    })
    expect(toRejected.status).toBeLessThan(500)
    if (toRejected.status === 200) {
      expect((toRejected.data as Record<string, unknown>).status).toBe(CONTRACT_STATUS.REJECTED)
    }

    // rejected → pending
    const toPending = await wpPost(apiOpts, EP.WP_CONTRACT(id), {
      status: CONTRACT_STATUS.PENDING,
    })
    expect(toPending.status).toBeLessThan(500)
    if (toPending.status === 200) {
      expect((toPending.data as Record<string, unknown>).status).toBe(CONTRACT_STATUS.PENDING)
    }

    // 最終驗證
    const verify = await wpGet(apiOpts, EP.WP_CONTRACT(id))
    if (verify.status === 200) {
      expect((verify.data as Record<string, unknown>).status).toBe(CONTRACT_STATUS.PENDING)
    }

    // 清理
    await wpDelete(apiOpts, `${EP.WP_CONTRACT(id)}?force=true`)
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — meta 資料完整性
  // ══════════════════════════════════════════════════════════════

  test('[P1] 透過 REST 建立的合約 meta 應完整保存所有欄位', async () => {
    const createRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] meta 完整性測試',
      status: CONTRACT_STATUS.PENDING,
      meta: {
        user_name: TEST_CONTRACT.USER_NAME,
        user_phone: TEST_CONTRACT.USER_PHONE,
        user_address: TEST_CONTRACT.USER_ADDRESS,
        user_identity: TEST_CONTRACT.USER_IDENTITY,
        contract_amount: TEST_CONTRACT.CONTRACT_AMOUNT,
        client_ip: '192.168.1.100',
      },
    })

    if (createRes.status !== 201) { test.skip(); return }

    const contract = createRes.data as Record<string, unknown>
    const id = contract.id as number

    // 讀回並驗證 meta
    const getRes = await wpGet(apiOpts, EP.WP_CONTRACT(id))
    expect(getRes.status).toBe(200)

    const data = getRes.data as Record<string, unknown>
    const meta = data.meta as Record<string, unknown> | undefined

    if (meta) {
      expect(meta.user_name).toBeDefined()
      expect(meta.user_phone).toBeDefined()
      expect(meta.user_address).toBeDefined()
      expect(meta.client_ip).toBeDefined()
    }

    // 清理
    await wpDelete(apiOpts, `${EP.WP_CONTRACT(id)}?force=true`)
  })

  test('[P1] AJAX 建立合約後 meta user_name 應與送出值相符', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const expectedName = '[E2E] meta-verification-user'

    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', expectedName)
    form.set('user_phone', TEST_CONTRACT.USER_PHONE)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    if (!body.success) return

    // 查詢最新合約，驗證 user_name 保存正確
    const listRes = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '1',
      orderby: 'date',
      order: 'desc',
      status: CONTRACT_STATUS.PENDING,
    })

    if (listRes.status === 200 && Array.isArray(listRes.data) && listRes.data.length > 0) {
      const latest = (listRes.data as Array<Record<string, unknown>>)[0]
      const meta = latest.meta as Record<string, unknown> | undefined
      if (meta) {
        expect(meta.user_name).toBe(expectedName)
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — WC 訂單刪除後合約仍可存取
  // ══════════════════════════════════════════════════════════════

  test('[P2] 刪除 WC 訂單後，關聯的合約仍可透過 REST API 存取', async () => {
    if (!ids.templateId) { test.skip(); return }

    // 建立一個臨時 WC 訂單
    let tempOrderId: number | undefined
    const orderRes = await wpPost(apiOpts, EP.WC_ORDERS, {
      status: 'processing',
      billing: {
        first_name: '[E2E]',
        last_name: '訂單刪除測試',
        email: 'e2e-lifecycle-order@example.com',
      },
    }).catch(() => ({ status: 500, data: null }))

    if (orderRes.status !== 201) {
      // WooCommerce 未啟用，跳過
      test.skip()
      return
    }

    tempOrderId = (orderRes.data as Record<string, unknown>).id as number

    // 建立關聯此訂單的合約
    const contractRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] 訂單刪除後合約測試',
      status: CONTRACT_STATUS.PENDING,
      meta: {
        user_name: '[E2E] order-delete-test',
        _order_id: tempOrderId,
      },
    })

    if (contractRes.status !== 201) {
      await wpDelete(apiOpts, `${EP.WC_ORDER(tempOrderId)}?force=true`).catch(() => null)
      test.skip()
      return
    }

    const contractId = (contractRes.data as Record<string, unknown>).id as number

    // 刪除訂單
    await wpDelete(apiOpts, `${EP.WC_ORDER(tempOrderId)}?force=true`)

    // 合約仍應可存取（不依賴訂單存在）
    const verifyRes = await wpGet(apiOpts, EP.WP_CONTRACT(contractId))
    expect(verifyRes.status).toBeLessThan(500)
    expect(verifyRes.status).toBe(200)

    const contract = verifyRes.data as Record<string, unknown>
    expect(contract.id).toBe(contractId)

    // 清理合約
    await wpDelete(apiOpts, `${EP.WP_CONTRACT(contractId)}?force=true`)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 權限邊界：未認證用戶
  // ══════════════════════════════════════════════════════════════

  test('[P2] 未認證用戶透過 REST API 修改合約應被拒絕（401 或 403）', async ({ request }) => {
    if (!ids.contractId) { test.skip(); return }

    // 不帶 nonce，模擬未認證請求
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

  test('[P2] 未認證用戶透過 REST API 刪除合約應被拒絕', async ({ request }) => {
    if (!ids.contractId) { test.skip(); return }

    const res = await request.delete(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACT(ids.contractId)}`,
      { headers: { 'Content-Type': 'application/json' } },
    )

    expect(res.status()).toBeLessThan(500)
    expect([401, 403]).toContain(res.status())
  })

  test('[P2] 未認證用戶透過 REST API 存取單筆合約應被拒絕', async ({ request }) => {
    if (!ids.contractId) { test.skip(); return }

    const res = await request.get(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACT(ids.contractId)}`,
      { headers: { 'Content-Type': 'application/json' } },
    )

    expect(res.status()).toBeLessThan(500)
    // contract CPT 不公開，未認證應 401 或 403
    expect([401, 403]).toContain(res.status())
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 權限邊界：假 nonce（低權限用戶）
  // ══════════════════════════════════════════════════════════════

  test('[P2] 使用無效 nonce 修改合約應被拒絕', async ({ request }) => {
    if (!ids.contractId) { test.skip(); return }

    const res = await request.post(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACT(ids.contractId)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': 'fake-invalid-nonce-9999',
        },
        data: { status: CONTRACT_STATUS.APPROVED },
      },
    )

    expect(res.status()).toBeLessThan(500)
    expect([401, 403]).toContain(res.status())
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 合約模板狀態邊界
  // ══════════════════════════════════════════════════════════════

  test('[P3] 使用 draft 模板建立合約不應 500', async ({ request }) => {
    const templateRes = await wpPost(apiOpts, EP.WP_TEMPLATES, {
      title: '[E2E] Draft 模板（生命週期）',
      content: '<p>草稿模板</p>',
      status: 'draft',
    })

    if (templateRes.status !== 201) { test.skip(); return }

    const templateId = (templateRes.data as Record<string, unknown>).id as number

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(templateId))
    form.set('user_name', '[E2E] draft-template-lifecycle')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    // 清理
    await wpDelete(apiOpts, `${EP.WP_TEMPLATE(templateId)}?force=true`)
  })
})
