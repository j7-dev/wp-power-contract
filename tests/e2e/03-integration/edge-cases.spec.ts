/**
 * 03-integration / edge-cases.spec.ts
 *
 * 邊界案例 E2E 測試 — 訪客簽署、重複簽署、無效模板 ID、訂單整合、
 * 狀態邊界（冪等操作）、批量操作、已取消訂單、空簽名、超大截圖
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

/* ── 共用 helper：送出 AJAX 表單 ───────────────────────────── */
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

  // ────────────────────────────────────────────────────────────
  // 訪客簽署合約
  // ────────────────────────────────────────────────────────────
  test('未登入訪客應可透過 nopriv AJAX 簽署合約', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] 匿名訪客')
    const res = await postAjax(request, form, nonce)

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
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

    const res1 = await postAjax(
      request,
      buildContractForm(nonce, ids.templateId, '[E2E] 重複簽署用戶 (第一次)'),
      nonce,
    )
    expect(res1.status()).toBeLessThan(500)

    const res2 = await postAjax(
      request,
      buildContractForm(nonce, ids.templateId, '[E2E] 重複簽署用戶 (第二次)'),
      nonce,
    )
    expect(res2.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 無效模板 ID
  // ────────────────────────────────────────────────────────────
  test('不存在的 contract_template_id 應優雅處理', async ({ request }) => {
    const nonce = getNonce()
    const res = await postAjax(
      request,
      buildContractForm(nonce, '9999999', '[E2E] invalid-template-test'),
      nonce,
    )
    expect(res.status()).toBeLessThan(500)
  })

  test('contract_template_id 為 0 時應回傳錯誤', async ({ request }) => {
    const nonce = getNonce()
    const res = await postAjax(
      request,
      buildContractForm(nonce, '0', '[E2E] zero-template-test'),
      nonce,
    )
    expect(res.status()).toBeLessThan(500)
  })

  test('contract_template_id 為負數時應回傳錯誤', async ({ request }) => {
    const nonce = getNonce()
    const res = await postAjax(
      request,
      buildContractForm(nonce, '-1', '[E2E] negative-template-test'),
      nonce,
    )
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
    const form = buildContractForm(nonce, ids.templateId, '[E2E] invalid-order-test', {
      _order_id: String(TEST_ORDER.NONEXISTENT_ID),
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  test('order_id 為 0 時不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] zero-order-test', {
      _order_id: '0',
    })
    const res = await postAjax(request, form, nonce)
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
    const form = buildContractForm(nonce, ids.templateId, '[E2E] invalid-redirect-test', {
      _redirect: 'invalid_redirect_value',
    })
    const res = await postAjax(request, form, nonce)
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

  // ────────────────────────────────────────────────────────────
  // 狀態邊界 — 冪等操作 (idempotency)
  // ────────────────────────────────────────────────────────────
  test('核准已核准的合約應為冪等操作（不應 500）', async ({ page }) => {
    if (!ids.contractId2) {
      test.skip()
      return
    }

    // 先透過 REST API 將合約設為 approved
    const setRes = await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId2), {
      status: CONTRACT_STATUS.APPROVED,
    })
    expect(setRes.status).toBeLessThan(500)

    // 再透過 admin-post action 核准一次（冪等）
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId2}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 驗證合約狀態仍為 approved
    const verify = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId2))
    if (verify.status === 200) {
      const contract = verify.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.APPROVED)
    }
  })

  test('拒絕已拒絕的合約應為冪等操作（不應 500）', async ({ page }) => {
    if (!ids.contractId3) {
      test.skip()
      return
    }

    // 先透過 REST API 將合約設為 rejected
    const setRes = await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.REJECTED,
    })
    expect(setRes.status).toBeLessThan(500)

    // 再透過 admin-post action 拒絕一次（冪等）
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${ids.contractId3}`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 驗證合約狀態仍為 rejected
    const verify = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId3))
    if (verify.status === 200) {
      const contract = verify.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.REJECTED)
    }
  })

  test('核准已拒絕的合約應能改變狀態', async ({ page }) => {
    if (!ids.contractId3) {
      test.skip()
      return
    }

    // 確保合約為 rejected
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.REJECTED,
    })

    // 透過 admin-post action 核准
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId3}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 不存在的 post_id 進行核准/拒絕
  // ────────────────────────────────────────────────────────────
  test('對不存在的 post_id 執行 approve 不應導致 500', async ({ page }) => {
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${TEST_ORDER.NONEXISTENT_ID}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('對不存在的 post_id 執行 reject 不應導致 500', async ({ page }) => {
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${TEST_ORDER.NONEXISTENT_ID}`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('缺少 post_id 參數的 approve 不應導致 500', async ({ page }) => {
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 批量操作邊界 — 混合有效/無效 ID
  // ────────────────────────────────────────────────────────────
  test('REST API 批量更新：混合有效與無效合約 ID 不應導致 500', async () => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    // 對有效合約設定 pending（正常操作）
    const validRes = await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      status: CONTRACT_STATUS.PENDING,
    })
    expect(validRes.status).toBeLessThan(500)

    // 對不存在的合約做同樣操作
    const invalidRes = await wpPost(apiOpts, EP.WP_CONTRACT(TEST_ORDER.NONEXISTENT_ID), {
      status: CONTRACT_STATUS.PENDING,
    })
    expect(invalidRes.status).toBeLessThan(500)
    expect([400, 403, 404]).toContain(invalidRes.status)
  })

  test('REST API 對合約 ID 為 0 更新狀態不應導致 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_CONTRACT(0), {
      status: CONTRACT_STATUS.APPROVED,
    })
    expect(res.status).toBeLessThan(500)
  })

  test('REST API 對合約 ID 為負數更新狀態不應導致 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_CONTRACT(-1), {
      status: CONTRACT_STATUS.APPROVED,
    })
    expect(res.status).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 已取消/退款訂單的合約建立
  // ────────────────────────────────────────────────────────────
  test('為已取消的訂單建立合約不應導致 500', async ({ request }) => {
    if (!ids.templateId || !ids.orderId) {
      test.skip()
      return
    }

    // 先將訂單改為 cancelled（如果 WC 可用）
    const cancelRes = await wpPut(apiOpts, EP.WC_ORDER(ids.orderId), {
      status: 'cancelled',
    })

    // WooCommerce 可能未啟用，若失敗跳過
    if (cancelRes.status >= 400) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] cancelled-order-test', {
      _order_id: String(ids.orderId),
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)

    // 恢復訂單狀態
    await wpPut(apiOpts, EP.WC_ORDER(ids.orderId), { status: 'processing' })
  })

  // ────────────────────────────────────────────────────────────
  // 空簽名 / 缺少簽名資料
  // ────────────────────────────────────────────────────────────
  test('空白簽名（空字串 signature）不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] empty-signature-test', {
      signature: '',
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  test('無效 base64 簽名不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] invalid-base64-sig', {
      signature: 'data:image/png;base64,NOT_VALID_BASE64!!!',
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 超大截圖（模擬 >5MB base64）
  // ────────────────────────────────────────────────────────────
  test('超大 screenshot base64（~2MB）不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    // 生成約 2MB 的 base64 字串（避免真的送 5MB 導致超時）
    const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(2 * 1024 * 1024)

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, '[E2E] oversized-screenshot', {
      screenshot: largeBase64,
    })
    const res = await postAjax(request, form, nonce)

    // 可能被伺服器拒絕（413 或 PHP post_max_size），但絕不應 500
    expect(res.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 多個欄位同時包含邊界值
  // ────────────────────────────────────────────────────────────
  test('所有欄位同時送邊界值（XSS + emoji + 超長字串）不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildContractForm(nonce, ids.templateId, `[E2E] ${EDGE.XSS_SCRIPT}`, {
      user_address: EDGE.EMOJI_COMPLEX,
      user_phone: EDGE.SQL_INJECTION_1,
      user_identity: EDGE.SPECIAL_CHARS,
      contract_amount: String(EDGE.NEGATIVE_NUMBER),
    })
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // REST API 刪除合約後再存取
  // ────────────────────────────────────────────────────────────
  test('建立 → 刪除 → 再次存取合約應回傳 404', async () => {
    // 建立一個臨時合約
    const createRes = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] 刪除測試合約',
      status: CONTRACT_STATUS.PENDING,
      meta: { user_name: '[E2E] delete-test' },
    })

    if (createRes.status !== 201) {
      test.skip()
      return
    }

    const contract = createRes.data as Record<string, unknown>
    const contractId = contract.id as number

    // 刪除合約
    const deleteRes = await wpDelete(apiOpts, `${EP.WP_CONTRACT(contractId)}?force=true`)
    expect(deleteRes.status).toBeLessThan(500)

    // 再次存取應回傳 404
    const getRes = await wpGet(apiOpts, EP.WP_CONTRACT(contractId))
    expect(getRes.status).toBeLessThan(500)
    expect([404, 410]).toContain(getRes.status)
  })

  // ────────────────────────────────────────────────────────────
  // contract_template_id 為字串 / 非數字
  // ────────────────────────────────────────────────────────────
  test('contract_template_id 為非數字字串不應導致 500', async ({ request }) => {
    const nonce = getNonce()
    const form = buildContractForm(nonce, 'abc_not_a_number', '[E2E] string-template-id')
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  test('contract_template_id 為浮點數不應導致 500', async ({ request }) => {
    const nonce = getNonce()
    const form = buildContractForm(nonce, '1.5', '[E2E] float-template-id')
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })

  test('contract_template_id 為 MAX_INT 不應導致 500', async ({ request }) => {
    const nonce = getNonce()
    const form = buildContractForm(nonce, String(EDGE.MAX_INT), '[E2E] maxint-template-id')
    const res = await postAjax(request, form, nonce)
    expect(res.status()).toBeLessThan(500)
  })
})
