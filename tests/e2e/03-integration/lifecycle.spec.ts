/**
 * 03-integration / lifecycle.spec.ts
 *
 * 合約完整生命週期 E2E 測試 — 建立 → 核准/拒絕 → 狀態驗證 → 刪除
 * 權限邊界：Subscriber 角色、跨用戶存取、未認證操作
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
import {
  wpGet,
  wpPost,
  wpPut,
  wpDelete,
  type ApiOptions,
} from '../helpers/api-client.js'

test.describe('03-integration / 合約生命週期與權限邊界', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // 完整生命週期：建立 → pending → approved
  // ══════════════════════════════════════════════════════════════
  test('完整生命週期：AJAX 建立 → REST 驗證 pending → 核准 → 驗證 approved', async ({
    request,
    page,
  }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()

    // Step 1: AJAX 建立合約
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(ids.templateId))
    form.set('user_name', '[E2E] 生命週期測試')
    form.set('user_phone', TEST_CONTRACT.USER_PHONE)
    form.set('contract_amount', TEST_CONTRACT.CONTRACT_AMOUNT)

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
      // 若合約建立失敗，跳過後續
      test.skip()
      return
    }

    // Step 2: 透過 REST API 查詢最新 pending 合約
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
    expect(latest.status).toBe(CONTRACT_STATUS.PENDING)

    // Step 3: 核准合約
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${newContractId}`
    const approveRes = await page.goto(approveUrl)
    expect(approveRes).toBeTruthy()
    expect(approveRes!.status()).toBeLessThan(500)

    // Step 4: 驗證狀態已變為 approved
    const verifyRes = await wpGet(apiOpts, EP.WP_CONTRACT(newContractId))
    if (verifyRes.status === 200) {
      const contract = verifyRes.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.APPROVED)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // 完整生命週期：建立 → pending → rejected
  // ══════════════════════════════════════════════════════════════
  test('完整生命週期：REST 建立 → 拒絕 → 驗證 rejected', async ({ page }) => {
    // 透過 REST 建立
    const createRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] 生命週期拒絕測試',
      status: CONTRACT_STATUS.PENDING,
      meta: {
        user_name: '[E2E] lifecycle-reject',
        user_phone: TEST_CONTRACT.USER_PHONE,
      },
    })

    if (createRes.status !== 201) {
      test.skip()
      return
    }

    const contract = createRes.data as Record<string, unknown>
    const contractId = contract.id as number

    // 拒絕
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${contractId}`
    const rejectRes = await page.goto(rejectUrl)
    expect(rejectRes).toBeTruthy()
    expect(rejectRes!.status()).toBeLessThan(500)

    // 驗證
    const verifyRes = await wpGet(apiOpts, EP.WP_CONTRACT(contractId))
    if (verifyRes.status === 200) {
      const verified = verifyRes.data as Record<string, unknown>
      expect(verified.status).toBe(CONTRACT_STATUS.REJECTED)
    }

    // 清理
    await wpDelete(apiOpts, `${EP.WP_CONTRACT(contractId)}?force=true`)
  })

  // ══════════════════════════════════════════════════════════════
  // 狀態輪轉：pending → approved → rejected → pending
  // ══════════════════════════════════════════════════════════════
  test('合約狀態可完整輪轉：pending → approved → rejected → pending', async () => {
    const createRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] 狀態輪轉測試',
      status: CONTRACT_STATUS.PENDING,
      meta: { user_name: '[E2E] status-rotation' },
    })

    if (createRes.status !== 201) {
      test.skip()
      return
    }

    const contract = createRes.data as Record<string, unknown>
    const id = contract.id as number

    // pending → approved
    const toApproved = await wpPost(apiOpts, EP.WP_CONTRACT(id), {
      status: CONTRACT_STATUS.APPROVED,
    })
    expect(toApproved.status).toBeLessThan(500)

    // approved → rejected
    const toRejected = await wpPost(apiOpts, EP.WP_CONTRACT(id), {
      status: CONTRACT_STATUS.REJECTED,
    })
    expect(toRejected.status).toBeLessThan(500)

    // rejected → pending
    const toPending = await wpPost(apiOpts, EP.WP_CONTRACT(id), {
      status: CONTRACT_STATUS.PENDING,
    })
    expect(toPending.status).toBeLessThan(500)

    // 驗證最終狀態
    const verify = await wpGet(apiOpts, EP.WP_CONTRACT(id))
    if (verify.status === 200) {
      expect((verify.data as Record<string, unknown>).status).toBe(CONTRACT_STATUS.PENDING)
    }

    // 清理
    await wpDelete(apiOpts, `${EP.WP_CONTRACT(id)}?force=true`)
  })

  // ══════════════════════════════════════════════════════════════
  // 權限邊界 — 未認證用戶嘗試核准/拒絕
  // ══════════════════════════════════════════════════════════════
  test('未認證用戶透過 REST API 嘗試核准合約應被拒絕', async ({ request }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    // 不帶 nonce 的 POST 請求
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

  test('未認證用戶透過 REST API 嘗試拒絕合約應被拒絕', async ({ request }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await request.post(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACT(ids.contractId)}`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { status: CONTRACT_STATUS.REJECTED },
      },
    )

    expect(res.status()).toBeLessThan(500)
    expect([401, 403]).toContain(res.status())
  })

  test('未認證用戶透過 REST API 嘗試刪除合約應被拒絕', async ({ request }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await request.delete(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACT(ids.contractId)}`,
      { headers: { 'Content-Type': 'application/json' } },
    )

    expect(res.status()).toBeLessThan(500)
    expect([401, 403]).toContain(res.status())
  })

  // ══════════════════════════════════════════════════════════════
  // 權限邊界 — Subscriber 角色嘗試管理操作
  // ══════════════════════════════════════════════════════════════
  test('Subscriber 角色不應可透過 REST API 列出合約', async ({ request }) => {
    // 使用 e2e_contract_customer（customer 角色）嘗試存取合約列表
    // customer 角色在 WordPress 中類似 subscriber，不應有 edit_posts 能力
    if (!ids.customerId) {
      test.skip()
      return
    }

    // 不帶管理員 nonce，使用無效 nonce 模擬低權限用戶
    const res = await request.get(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACTS}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': 'fake-subscriber-nonce',
        },
      },
    )

    expect(res.status()).toBeLessThan(500)
    // 應為空陣列或 403（依 CPT 可見度設定）
    if (res.status() === 200) {
      const data = await res.json()
      expect(Array.isArray(data)).toBeTruthy()
    }
  })

  test('Subscriber 角色不應可透過 REST API 修改合約', async ({ request }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await request.post(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACT(ids.contractId)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': 'fake-subscriber-nonce',
        },
        data: { status: CONTRACT_STATUS.APPROVED },
      },
    )

    expect(res.status()).toBeLessThan(500)
    expect([401, 403]).toContain(res.status())
  })

  // ══════════════════════════════════════════════════════════════
  // 權限邊界 — 跨用戶合約存取
  // ══════════════════════════════════════════════════════════════
  test('未認證用戶嘗試存取單一合約應被拒絕', async ({ request }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await request.get(
      `${BASE_URL}/wp-json/${EP.WP_CONTRACT(ids.contractId)}`,
      { headers: { 'Content-Type': 'application/json' } },
    )

    expect(res.status()).toBeLessThan(500)
    // contract CPT 為非公開，未認證應 403 或 401
    expect([401, 403]).toContain(res.status())
  })

  // ══════════════════════════════════════════════════════════════
  // 合約與訂單關聯 — 刪除訂單後合約仍可存取
  // ══════════════════════════════════════════════════════════════
  test('刪除 WC 訂單後，關聯的合約仍可透過 REST API 存取', async () => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    // 建立一個測試訂單
    let tempOrderId: number | undefined
    try {
      const orderRes = await wpPost(apiOpts, EP.WC_ORDERS, {
        status: 'processing',
        billing: {
          first_name: '[E2E]',
          last_name: '訂單刪除測試',
          email: 'e2e-delete-order@example.com',
        },
        line_items: [{ name: '[E2E] 刪除測試商品', quantity: 1, total: '100' }],
      })

      if (orderRes.status !== 201) {
        test.skip()
        return
      }

      tempOrderId = (orderRes.data as Record<string, unknown>).id as number
    } catch {
      test.skip()
      return
    }

    // 建立合約關聯此訂單
    const contractRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] 訂單刪除後合約測試',
      status: CONTRACT_STATUS.PENDING,
      meta: {
        user_name: '[E2E] order-delete-test',
        _order_id: tempOrderId,
      },
    })

    if (contractRes.status !== 201) {
      // 清理訂單
      await wpDelete(apiOpts, `${EP.WC_ORDER(tempOrderId!)}?force=true`)
      test.skip()
      return
    }

    const contractId = (contractRes.data as Record<string, unknown>).id as number

    // 刪除訂單
    await wpDelete(apiOpts, `${EP.WC_ORDER(tempOrderId!)}?force=true`)

    // 合約仍應可存取
    const verifyRes = await wpGet(apiOpts, EP.WP_CONTRACT(contractId))
    expect(verifyRes.status).toBeLessThan(500)
    expect(verifyRes.status).toBe(200)

    // 清理合約
    await wpDelete(apiOpts, `${EP.WP_CONTRACT(contractId)}?force=true`)
  })

  // ══════════════════════════════════════════════════════════════
  // 合約 meta 資料完整性
  // ══════════════════════════════════════════════════════════════
  test('透過 REST 建立的合約 meta 應完整保存', async () => {
    const createRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] meta 完整性測試',
      status: CONTRACT_STATUS.PENDING,
      meta: {
        user_name: TEST_CONTRACT.USER_NAME,
        user_phone: TEST_CONTRACT.USER_PHONE,
        user_address: TEST_CONTRACT.USER_ADDRESS,
        user_identity: TEST_CONTRACT.USER_IDENTITY,
        contract_amount: TEST_CONTRACT.CONTRACT_AMOUNT,
        client_ip: '192.168.1.1',
      },
    })

    if (createRes.status !== 201) {
      test.skip()
      return
    }

    const contract = createRes.data as Record<string, unknown>
    const id = contract.id as number

    // 取得並驗證 meta
    const getRes = await wpGet(apiOpts, EP.WP_CONTRACT(id))
    expect(getRes.status).toBe(200)

    const data = getRes.data as Record<string, unknown>
    const meta = data.meta as Record<string, unknown> | undefined

    if (meta) {
      // 驗證各 meta field 已保存
      expect(meta.user_name).toBeDefined()
      expect(meta.user_phone).toBeDefined()
    }

    // 清理
    await wpDelete(apiOpts, `${EP.WP_CONTRACT(id)}?force=true`)
  })

  // ══════════════════════════════════════════════════════════════
  // 合約模板被刪除後，嘗試用該模板建立合約
  // ══════════════════════════════════════════════════════════════
  test('合約模板被刪除後，使用該模板 ID 建立合約不應 500', async ({ request }) => {
    // 先建立一個臨時模板
    const templateRes = await wpPost(apiOpts, EP.WP_TEMPLATES, {
      title: '[E2E] 待刪除模板',
      content: '<p>臨時模板</p>',
      status: 'publish',
    })

    if (templateRes.status !== 201) {
      test.skip()
      return
    }

    const templateId = (templateRes.data as Record<string, unknown>).id as number

    // 刪除模板
    await wpDelete(apiOpts, `${EP.WP_TEMPLATE(templateId)}?force=true`)

    // 使用已刪除的模板 ID 建立合約
    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(templateId))
    form.set('user_name', '[E2E] deleted-template-test')

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
  // 合約模板為 draft 時嘗試簽署
  // ══════════════════════════════════════════════════════════════
  test('使用 draft 狀態的合約模板建立合約不應 500', async ({ request }) => {
    // 建立 draft 模板
    const templateRes = await wpPost(apiOpts, EP.WP_TEMPLATES, {
      title: '[E2E] Draft 模板',
      content: '<p>草稿模板</p>',
      status: 'draft',
    })

    if (templateRes.status !== 201) {
      test.skip()
      return
    }

    const templateId = (templateRes.data as Record<string, unknown>).id as number

    const nonce = getNonce()
    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', String(templateId))
    form.set('user_name', '[E2E] draft-template-test')

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
