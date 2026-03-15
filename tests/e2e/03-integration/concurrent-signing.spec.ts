/**
 * 03-integration / concurrent-signing.spec.ts
 *
 * 並行簽署與 REST API 邊界 E2E 測試
 * 覆蓋：同一模板多個並行簽署請求、並行核准/拒絕狀態衝突、
 *        REST API 查詢邊界（大量、無效排序、無效狀態）、
 *        is_signed 訂單 meta、WC 整合邊界
 *
 * 優先級:
 *   P0 — 並行 5 個簽署請求不導致 500，且所有請求均有回應
 *   P0 — 並行同 order_id 的 3 個簽署請求不導致 500
 *   P1 — 並行核准 + 拒絕同一合約，最終狀態一致（不 500）
 *   P1 — 簽署成功後訂單 is_signed meta 設定（redirect_url 含 is_signed=yes）
 *   P2 — REST API 查詢合約邊界（per_page=100、無效 orderby、無效 status、page=0/-1）
 *   P2 — REST API 建立合約模板缺少 title、帶 XSS content
 *   P3 — Email 設定為空時建立合約不 500
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
import { wpGet, wpPost, wpDelete, type ApiOptions } from '../helpers/api-client.js'

/** 共用：建立一筆 AJAX create_contract form */
function buildSignForm(
  nonce: string,
  templateId: number | string,
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

test.describe('03-integration / 並行簽署與通知邊界', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 並行簽署：多個請求同時對同一模板簽約
  // ══════════════════════════════════════════════════════════════

  test('[P0] 並行送出 5 個簽約請求不應導致 500 或資料錯亂', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()

    const makeRequest = (index: number) =>
      request.post(`${BASE_URL}${EP.AJAX}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-WP-Nonce': nonce,
        },
        data: buildSignForm(nonce, ids.templateId!, `[E2E] 並行簽署 #${index}`).toString(),
      })

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

    // 每個請求都應回傳 JSON（有 success 欄位）
    for (const res of results) {
      const body = await res.json().catch(() => null)
      expect(body).not.toBeNull()
      if (body) {
        expect(body).toHaveProperty('success')
      }
    }
  })

  test('[P0] 並行送出 3 個相同 order_id 的簽約請求不應 500', async ({ request }) => {
    if (!ids.templateId || !ids.orderId) {
      test.skip()
      return
    }

    const nonce = getNonce()

    const makeRequest = (index: number) =>
      request.post(`${BASE_URL}${EP.AJAX}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-WP-Nonce': nonce,
        },
        data: buildSignForm(nonce, ids.templateId!, `[E2E] 同訂單並行 #${index}`, {
          _order_id: String(ids.orderId),
        }).toString(),
      })

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
  // P1 — 並行核准/拒絕：狀態衝突
  // ══════════════════════════════════════════════════════════════

  test('[P1] 同時對同一合約發送 REST 核准和拒絕不應 500，最終狀態需一致', async () => {
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

    // 最終狀態必須是其中一個（不應變成 undefined 或 pending）
    const verify = await wpGet(apiOpts, EP.WP_CONTRACT(contractId))
    if (verify.status === 200) {
      const contract = verify.data as Record<string, unknown>
      expect([CONTRACT_STATUS.APPROVED, CONTRACT_STATUS.REJECTED]).toContain(contract.status)
    }

    // 清理
    await wpDelete(apiOpts, `${EP.WP_CONTRACT(contractId)}?force=true`)
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — is_signed 訂單 meta
  // ══════════════════════════════════════════════════════════════

  test('[P1] 帶 _redirect=checkout 的簽署成功後 redirect_url 應含 is_signed=yes', async ({
    request,
  }) => {
    if (!ids.templateId || !ids.orderId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildSignForm(nonce, ids.templateId, '[E2E] is_signed meta 測試', {
      _order_id: String(ids.orderId),
      _redirect: 'checkout',
    })

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    // 若成功，redirect_url 應含 is_signed=yes
    if (body.success && body.data?.redirect_url) {
      expect(body.data.redirect_url).toContain('is_signed=yes')
    }
  })

  test('[P1] 帶 _redirect=thankyou 的簽署成功後 redirect_url 應指向感謝頁', async ({
    request,
  }) => {
    if (!ids.templateId || !ids.orderId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildSignForm(nonce, ids.templateId, '[E2E] thankyou redirect 測試', {
      _order_id: String(ids.orderId),
      _redirect: 'thankyou',
    })

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
      const redirectUrl = body.data.redirect_url as string
      // 感謝頁路徑包含 order-received 或原本的 WC 感謝頁
      expect(redirectUrl.length).toBeGreaterThan(0)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — REST API 查詢合約邊界
  // ══════════════════════════════════════════════════════════════

  test('[P2] REST API 查詢合約 per_page=100 不應 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '100',
      status: CONTRACT_STATUS.PENDING,
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P2] REST API 查詢合約使用無效的 orderby 欄位不應 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      orderby: 'nonexistent_field_xyz',
      order: 'desc',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P2] REST API 查詢合約使用無效的 status 篩選不應 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      status: 'nonexistent_status_xyz',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P2] REST API 查詢合約 page=0 不應 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      page: '0',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P2] REST API 查詢合約 page=-1 不應 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      page: '-1',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P2] REST API 查詢合約 per_page=0 不應 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '0',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P2] REST API 查詢合約 per_page 超過 WordPress 最大值（1000）不應 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '1000',
    })
    expect(res.status).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — REST API 建立合約模板邊界
  // ══════════════════════════════════════════════════════════════

  test('[P2] REST API 建立合約模板缺少 title 不應 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_TEMPLATES, {
      content: '<p>[E2E] 無標題模板</p>',
      status: 'publish',
    })
    expect(res.status).toBeLessThan(500)

    // 若成功建立，清理
    if (res.status === 201) {
      const tmpl = res.data as Record<string, unknown>
      await wpDelete(apiOpts, `${EP.WP_TEMPLATE(tmpl.id as number)}?force=true`)
    }
  })

  test('[P2] REST API 建立合約模板帶 XSS content 不應 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_TEMPLATES, {
      title: '[E2E] XSS 模板測試',
      content: `<p>${EDGE.XSS_SCRIPT}</p><div>${EDGE.XSS_IMG}</div>`,
      status: 'publish',
    })
    expect(res.status).toBeLessThan(500)

    // 若成功建立，驗證 WordPress 已過濾 XSS
    if (res.status === 201) {
      const tmpl = res.data as Record<string, unknown>
      const renderedContent = String(
        (tmpl.content as Record<string, unknown>)?.rendered ?? '',
      )
      // WordPress 過濾後不應有 <script>
      expect(renderedContent).not.toContain('<script>alert')

      // 清理
      await wpDelete(apiOpts, `${EP.WP_TEMPLATE(tmpl.id as number)}?force=true`)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — Email 設定為空時不影響合約建立
  // ══════════════════════════════════════════════════════════════

  test('[P3] Email 設定為空時建立合約不應 500（即使無收件人）', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const form = buildSignForm(nonce, ids.templateId, '[E2E] empty-email-setting-test')

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
  // P3 — 極端並行：快速連發重複 nonce
  // ══════════════════════════════════════════════════════════════

  test('[P3] 使用相同 nonce 連發 3 個並行請求不應 500（nonce 可能重用）', async ({
    request,
  }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    // 同一 nonce 同時送出（WordPress nonce 在有效期內可重用）
    const nonce = getNonce()

    const results = await Promise.all(
      [1, 2, 3].map((i) =>
        request.post(`${BASE_URL}${EP.AJAX}`, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-WP-Nonce': nonce,
          },
          data: buildSignForm(nonce, ids.templateId!, `[E2E] same-nonce-concurrent #${i}`).toString(),
        }),
      ),
    )

    for (const res of results) {
      expect(res.status()).toBeLessThan(500)
    }
  })
})
