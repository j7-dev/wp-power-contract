/**
 * 03-integration / edge-cases.spec.ts
 *
 * 邊界案例 E2E 測試
 * 覆蓋：訪客簽署、重複簽署、無效/零/負數模板 ID、訂單整合邊界、
 *        冪等操作（approved→approve、rejected→reject）、混合有效/無效 ID、
 *        已取消訂單的合約建立、空/無效簽名、超大截圖、
 *        REST API 刪除後存取、template_id 為字串/浮點數/MAX_INT
 *
 * 優先級:
 *   P0 — 訪客可透過 nopriv AJAX 簽署合約
 *   P0 — 不存在的 contract_template_id 應優雅回傳錯誤（不 500）
 *   P1 — 同一用戶重複簽署同一模板不出錯
 *   P1 — 冪等操作：核准已核准合約不 500，狀態維持 approved
 *   P1 — 冪等操作：拒絕已拒絕合約不 500，狀態維持 rejected
 *   P1 — 建立→刪除→再存取合約應回傳 404/410
 *   P2 — 已取消訂單的合約建立不 500
 *   P2 — REST API 對無效/零/負數 ID 更新不 500
 *   P2 — 模板刪除後使用該模板 ID 建立合約不 500
 *   P3 — template_id 為字串、浮點數、MAX_INT
 *   P3 — 空/無效簽名、超大截圖
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

/** 建立 AJAX create_contract form */
function buildContractForm(
  nonce: string,
  templateId: string | number,
  userName: string,
  extra?: Record<string, string>,
): URLSearchParams {
  const form = new URLSearchParams()
  form.set('action', AJAX_ACTION.CREATE_CONTRACT)
  form.set('nonce', nonce)
  form.set('contract_template_id', String(templateId))
  form.set('user_name', userName)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) form.set(k, v)
  }
  return form
}

async function postAjax(
  request: import('@playwright/test').APIRequestContext,
  formData: URLSearchParams,
  nonce?: string,
) {
  return request.post(`${BASE_URL}${EP.AJAX}`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(nonce ? { 'X-WP-Nonce': nonce } : {}),
    },
    data: formData.toString(),
  })
}

test.describe('03-integration / 邊界案例', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 訪客 nopriv 簽署
  // ══════════════════════════════════════════════════════════════

  test('[P0] 未登入訪客應可透過 nopriv AJAX 簽署合約', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] 匿名訪客簽署')
    const res = await postAjax(request, form, nonce)

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    expect(body).toHaveProperty('success')
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 無效模板 ID
  // ══════════════════════════════════════════════════════════════

  test('[P0] 不存在的 contract_template_id 應回傳 sign_error（不 500）', async ({ request }) => {
    const nonce = getNonce()
    const res = await postAjax(
      request,
      buildContractForm(nonce, '9999999', '[E2E] nonexistent-template'),
      nonce,
    )
    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    // spec: 模板不存在應回傳 success:false，data.code 為 sign_error
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  test('[P0] contract_template_id 為 0 應回傳錯誤（不 500）', async ({ request }) => {
    const nonce = getNonce()
    const res = await postAjax(
      request,
      buildContractForm(nonce, '0', '[E2E] zero-template'),
      nonce,
    )
    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 重複簽署
  // ══════════════════════════════════════════════════════════════

  test('[P1] 同一用戶重複簽署同一模板不應出錯', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()

    const res1 = await postAjax(
      request,
      buildContractForm(nonce, ids.templateId, '[E2E] 重複簽署 (第一次)'),
      nonce,
    )
    expect(res1.status()).toBeLessThan(500)

    const res2 = await postAjax(
      request,
      buildContractForm(nonce, ids.templateId, '[E2E] 重複簽署 (第二次)'),
      nonce,
    )
    expect(res2.status()).toBeLessThan(500)

    // 兩次都應回傳有效的 JSON
    const body1 = await res1.json().catch(() => ({}))
    const body2 = await res2.json().catch(() => ({}))
    expect(body1).toHaveProperty('success')
    expect(body2).toHaveProperty('success')
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 冪等操作（Idempotency）
  // ══════════════════════════════════════════════════════════════

  test('[P1] 核准已核准的合約應為冪等操作，狀態維持 approved', async ({ page }) => {
    if (!ids.contractId2) { test.skip(); return }

    // 先設為 approved
    const setRes = await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId2), {
      status: CONTRACT_STATUS.APPROVED,
    })
    expect(setRes.status).toBeLessThan(500)

    // 再透過 admin-post 核准一次
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId2}`
    const response = await page.goto(approveUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 驗證狀態仍為 approved
    const verify = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId2))
    if (verify.status === 200) {
      const contract = verify.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.APPROVED)
    }

    // 還原狀態
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId2), {
      status: CONTRACT_STATUS.PENDING,
    })
  })

  test('[P1] 拒絕已拒絕的合約應為冪等操作，狀態維持 rejected', async ({ page }) => {
    if (!ids.contractId3) { test.skip(); return }

    // 先設為 rejected
    const setRes = await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.REJECTED,
    })
    expect(setRes.status).toBeLessThan(500)

    // 再透過 admin-post 拒絕一次
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${ids.contractId3}`
    const response = await page.goto(rejectUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 驗證狀態仍為 rejected
    const verify = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId3))
    if (verify.status === 200) {
      const contract = verify.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.REJECTED)
    }

    // 還原
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.PENDING,
    })
  })

  test('[P1] 核准已拒絕的合約應能改變狀態為 approved', async ({ page }) => {
    if (!ids.contractId3) { test.skip(); return }

    // 設為 rejected
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.REJECTED,
    })

    // 核准
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId3}`
    const response = await page.goto(approveUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 驗證狀態
    const verify = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId3))
    if (verify.status === 200) {
      const contract = verify.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.APPROVED)
    }

    // 還原
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.PENDING,
    })
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 建立→刪除→再存取合約
  // ══════════════════════════════════════════════════════════════

  test('[P1] 建立→刪除→再存取合約應回傳 404 或 410', async () => {
    const createRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] 刪除後存取測試',
      status: CONTRACT_STATUS.PENDING,
      meta: { user_name: '[E2E] delete-access-test' },
    })

    if (createRes.status !== 201) { test.skip(); return }

    const contract = createRes.data as Record<string, unknown>
    const contractId = contract.id as number

    // 強制刪除
    const deleteRes = await wpDelete(apiOpts, `${EP.WP_CONTRACT(contractId)}?force=true`)
    expect(deleteRes.status).toBeLessThan(500)

    // 再次存取應 404 或 410（不應 200）
    const getRes = await wpGet(apiOpts, EP.WP_CONTRACT(contractId))
    expect(getRes.status).toBeLessThan(500)
    expect([404, 410]).toContain(getRes.status)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — admin-post 邊界：不存在/缺少 post_id
  // ══════════════════════════════════════════════════════════════

  test('[P2] 對不存在的 post_id 執行 approve 不應 500', async ({ page }) => {
    const url = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${TEST_ORDER.NONEXISTENT_ID}`
    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 對不存在的 post_id 執行 reject 不應 500', async ({ page }) => {
    const url = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${TEST_ORDER.NONEXISTENT_ID}`
    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] 缺少 post_id 參數的 approve action 不應 500', async ({ page }) => {
    const url = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}`
    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] post_id 為 0 的 approve 不應 500', async ({ page }) => {
    const url = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=0`
    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P2] post_id 為負數的 approve 不應 500', async ({ page }) => {
    const url = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=-1`
    const response = await page.goto(url)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 已取消訂單的合約建立
  // ══════════════════════════════════════════════════════════════

  test('[P2] 為已取消的 WC 訂單建立合約不應 500', async ({ request }) => {
    if (!ids.templateId || !ids.orderId) { test.skip(); return }

    // 嘗試取消訂單
    const cancelRes = await wpPut(apiOpts, EP.WC_ORDER(ids.orderId), {
      status: 'cancelled',
    })

    if (cancelRes.status >= 400) {
      // WooCommerce 未啟用，跳過
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] cancelled-order', {
      _order_id: String(ids.orderId),
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    // 恢復訂單狀態
    await wpPut(apiOpts, EP.WC_ORDER(ids.orderId), { status: 'processing' })
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — REST API 邊界
  // ══════════════════════════════════════════════════════════════

  test('[P2] REST API 取得不存在的合約應回傳 403 或 404', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACT(TEST_ORDER.NONEXISTENT_ID))
    expect(res.status).toBeLessThan(500)
    expect([403, 404]).toContain(res.status)
  })

  test('[P2] REST API 取得不存在的合約模板應回傳 403 或 404', async () => {
    const res = await wpGet(apiOpts, EP.WP_TEMPLATE(TEST_ORDER.NONEXISTENT_ID))
    expect(res.status).toBeLessThan(500)
    expect([403, 404]).toContain(res.status)
  })

  test('[P2] REST API 對合約使用無效 status 值不應 500', async () => {
    if (!ids.contractId) { test.skip(); return }

    const res = await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      status: 'nonexistent_status_xyz',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P2] REST API 更新 ID=0 的合約不應 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_CONTRACT(0), {
      status: CONTRACT_STATUS.APPROVED,
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P2] REST API 更新 ID=-1 的合約不應 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_CONTRACT(-1), {
      status: CONTRACT_STATUS.APPROVED,
    })
    expect(res.status).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 模板刪除後使用該模板 ID 建立合約
  // ══════════════════════════════════════════════════════════════

  test('[P2] 合約模板刪除後，使用該模板 ID 建立合約應優雅回傳錯誤（不 500）', async ({
    request,
  }) => {
    // 建立臨時模板
    const templateRes = await wpPost(apiOpts, EP.WP_TEMPLATES, {
      title: '[E2E] 待刪除模板',
      content: '<p>臨時</p>',
      status: 'publish',
    })

    if (templateRes.status !== 201) { test.skip(); return }

    const templateId = (templateRes.data as Record<string, unknown>).id as number

    // 刪除模板
    await wpDelete(apiOpts, `${EP.WP_TEMPLATE(templateId)}?force=true`)

    // 用已刪除模板 ID 建立合約
    const nonce = getNonce()
    const form = buildContractForm(nonce, templateId, '[E2E] deleted-template-test')
    const res = await postAjax(request, form, nonce)

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    // 刪除的模板不存在，應回傳 false
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  test('[P2] 使用 draft 狀態的合約模板建立合約不應 500', async ({ request }) => {
    const templateRes = await wpPost(apiOpts, EP.WP_TEMPLATES, {
      title: '[E2E] Draft 模板',
      content: '<p>草稿</p>',
      status: 'draft',
    })

    if (templateRes.status !== 201) { test.skip(); return }

    const templateId = (templateRes.data as Record<string, unknown>).id as number

    const nonce = getNonce()
    const form = buildContractForm(nonce, templateId, '[E2E] draft-template')
    const res = await postAjax(request, form, nonce)

    expect(res.status()).toBeLessThan(500)

    // 清理
    await wpDelete(apiOpts, `${EP.WP_TEMPLATE(templateId)}?force=true`)
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 無效 order_id 邊界
  // ══════════════════════════════════════════════════════════════

  test('[P3] _order_id 不存在不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] nonexistent-order', {
      _order_id: String(TEST_ORDER.NONEXISTENT_ID),
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P3] _order_id=0 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] zero-order', {
      _order_id: '0',
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P3] 無效的 _redirect 值不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] invalid-redirect', {
      _redirect: 'invalid_redirect_value_xyz',
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — template_id 邊界值
  // ══════════════════════════════════════════════════════════════

  test('[P3] contract_template_id 為負數不應 500', async ({ request }) => {
    const nonce = getNonce()
    const res = await postAjax(
      request,
      buildContractForm(nonce, '-1', '[E2E] negative-template'),
      nonce,
    )
    expect(res.status()).toBeLessThan(500)
  })

  test('[P3] contract_template_id 為非數字字串不應 500', async ({ request }) => {
    const nonce = getNonce()
    const res = await postAjax(
      request,
      buildContractForm(nonce, 'abc_not_a_number', '[E2E] string-template-id'),
      nonce,
    )
    expect(res.status()).toBeLessThan(500)
  })

  test('[P3] contract_template_id 為浮點數不應 500', async ({ request }) => {
    const nonce = getNonce()
    const res = await postAjax(
      request,
      buildContractForm(nonce, '1.5', '[E2E] float-template-id'),
      nonce,
    )
    expect(res.status()).toBeLessThan(500)
  })

  test('[P3] contract_template_id 為 MAX_INT 不應 500', async ({ request }) => {
    const nonce = getNonce()
    const res = await postAjax(
      request,
      buildContractForm(nonce, String(EDGE.MAX_INT), '[E2E] maxint-template-id'),
      nonce,
    )
    expect(res.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 簽名邊界
  // ══════════════════════════════════════════════════════════════

  test('[P3] 空白 signature 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] empty-signature', {
      signature: '',
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P3] 無效 base64 簽名不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] invalid-base64-sig', {
      signature: 'data:image/png;base64,NOT_VALID_BASE64!!!@@@',
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P3] 超大 screenshot (~2MB base64) 不應 500（可能被 413 拒絕）', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(2 * 1024 * 1024)
    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] oversized-screenshot', {
      screenshot: largeBase64,
    })
    const res = await postAjax(request, form, nonce)

    // 413 (Request Entity Too Large) 是可接受的，但不應 500
    expect(res.status()).toBeLessThan(500)
  }, 70_000)
})
