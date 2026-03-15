/**
 * 03-integration / data-boundary.spec.ts
 *
 * 資料邊界 E2E 測試 — 完整邊界案例矩陣
 * 覆蓋: XSS、SQL Injection、Unicode/CJK/Emoji/RTL、特殊字元、
 *        Null Byte、空值、極端長度、數字邊界（負數/零/最大整數）、
 *        MIME 邊界、HTML 實體、REST API 欄位邊界
 *
 * 優先級:
 *   P1 — XSS 防護（<script>、img onerror、SVG onload、javascript: URL）
 *   P1 — SQL Injection 防護（user_name、contract_template_id、user_phone）
 *   P1 — 極端長度輸入（10000 字元 user_name）
 *   P2 — Unicode / 多語言：CJK、日文、韓文、Emoji、RTL 阿拉伯文
 *   P2 — 特殊字元、HTML 實體、Null Byte
 *   P2 — contract_amount 數字邊界（負數、零、超大、浮點數）
 *   P3 — REST API 建立合約時 XSS title 被過濾
 *   P3 — 多欄位同時包含邊界值（組合攻擊）
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  AJAX_ACTION,
  CONTRACT_STATUS,
  EDGE,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

/** 共用：送出 AJAX create_contract 表單 */
async function postSignForm(
  request: import('@playwright/test').APIRequestContext,
  nonce: string,
  templateId: number,
  userName: string,
  extra?: Record<string, string>,
) {
  const form = new URLSearchParams()
  form.set('action', AJAX_ACTION.CREATE_CONTRACT)
  form.set('nonce', nonce)
  form.set('contract_template_id', String(templateId))
  form.set('user_name', userName)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) form.set(k, v)
  }

  return request.post(`${BASE_URL}${EP.AJAX}`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-WP-Nonce': nonce,
    },
    data: form.toString(),
  })
}

test.describe('03-integration / 資料邊界', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — XSS 防護
  // ══════════════════════════════════════════════════════════════

  test('[P1] user_name 含 <script> XSS 不應 500，回應中不含未轉義 script', async ({
    request,
  }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.XSS_SCRIPT}`)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    const bodyStr = JSON.stringify(body)
    // 回應中不應直接包含未轉義的 <script>alert
    expect(bodyStr).not.toContain('<script>alert')
  })

  test('[P1] user_name 含 <img onerror> XSS 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.XSS_IMG}`)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P1] user_address 含 <svg/onload> XSS 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] svg-xss', {
      user_address: EDGE.XSS_SVG,
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('[P1] user_identity 含 javascript: URL XSS 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] js-url-xss', {
      user_identity: `javascript:${EDGE.XSS_SCRIPT}`,
    })
    expect(res.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — SQL Injection 防護
  // ══════════════════════════════════════════════════════════════

  test('[P1] user_name 含 SQL injection (DROP TABLE) 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.SQL_INJECTION_1}`)
    expect(res.status()).toBeLessThan(500)

    // 確認合約建立正常（不因 SQL 注入中斷）
    const body = await res.json().catch(() => ({}))
    expect(body).toHaveProperty('success')
  })

  test('[P1] contract_template_id 含 SQL injection (OR 1=1) 不應 500', async ({ request }) => {
    const nonce = getNonce()

    const form = new URLSearchParams()
    form.set('action', AJAX_ACTION.CREATE_CONTRACT)
    form.set('nonce', nonce)
    form.set('contract_template_id', EDGE.SQL_INJECTION_2)
    form.set('user_name', '[E2E] sql-template-id')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: form.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    // SQL injection 在 template_id 位置應被拒絕（sign_error）而非成功
    const body = await res.json().catch(() => ({}))
    if (body.success !== undefined) {
      expect(body.success).toBe(false)
    }
  })

  test('[P1] user_phone 含 SQL injection (SELECT) 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] sql-phone', {
      user_phone: EDGE.SQL_INJECTION_3,
    })
    expect(res.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 極端長度
  // ══════════════════════════════════════════════════════════════

  test('[P1] user_name 為 10000 字元不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(
      request,
      nonce,
      ids.templateId,
      `[E2E] ${'A'.repeat(10_000)}`,
    )
    expect(res.status()).toBeLessThan(500)
  })

  test('[P1] user_address 為 10000 字元不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] long-address', {
      user_address: 'A'.repeat(10_000),
    })
    expect(res.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — Unicode / 多語言
  // ══════════════════════════════════════════════════════════════

  test('[P2] CJK（中文）user_name 應可正常處理', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.UNICODE_CJK}`)
    expect(res.status()).toBeLessThan(500)

    const body = await res.json().catch(() => ({}))
    expect(body).toHaveProperty('success')
  })

  test('[P2] 日文字元 user_name 應可正常處理', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.UNICODE_JAPANESE}`)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] 韓文字元 user_name 應可正常處理', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.UNICODE_KOREAN}`)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] RTL 阿拉伯文 user_name 應可正常處理', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    // مرحبا = Hello in Arabic
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] مرحبا بالعالم')
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] 基礎 Emoji user_name 應可正常處理', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.EMOJI}`)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] 複雜 ZWJ Emoji（家庭+彩虹旗）應可正常處理', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.EMOJI_COMPLEX}`)
    expect(res.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 特殊字元、HTML 實體、Null Byte
  // ══════════════════════════════════════════════════════════════

  test('[P2] 特殊符號 user_name (!@#$%) 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.SPECIAL_CHARS}`)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] HTML 實體字元 user_name (&amp; &lt;) 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.HTML_ENTITIES}`)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] Null Byte user_name 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, `[E2E] ${EDGE.NULL_BYTE}`)
    expect(res.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 數字邊界
  // ══════════════════════════════════════════════════════════════

  test('[P2] 負數 contract_amount (-1) 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] negative-amount', {
      contract_amount: String(EDGE.NEGATIVE_NUMBER),
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] 零 contract_amount (0) 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] zero-amount', {
      contract_amount: String(EDGE.ZERO),
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] 浮點數 contract_amount (0.001) 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] float-amount', {
      contract_amount: String(EDGE.FLOAT_NUMBER),
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] 超大數字 contract_amount (MAX_INT) 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] maxint-amount', {
      contract_amount: String(EDGE.MAX_INT),
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] 超出 32-bit 整數上限的 contract_amount 不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] huge-amount', {
      contract_amount: String(EDGE.HUGE_NUMBER),
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('[P2] 非數字 contract_amount 字串不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, '[E2E] nan-amount', {
      contract_amount: 'not_a_number',
    })
    expect(res.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — REST API XSS 過濾
  // ══════════════════════════════════════════════════════════════

  test('[P3] REST API 建立合約 XSS title 應被 WordPress 過濾', async () => {
    const res = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: `[E2E] ${EDGE.XSS_SCRIPT}`,
      status: CONTRACT_STATUS.PENDING,
      meta: { user_name: `[E2E] ${EDGE.XSS_SCRIPT}` },
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 201) {
      const contract = res.data as Record<string, unknown>
      const titleObj = contract.title as Record<string, unknown>
      const rendered = String(titleObj?.rendered ?? '')

      // WordPress 應過濾 <script>
      expect(rendered).not.toContain('<script>')

      // 清理
      const id = contract.id as number
      await wpGet(apiOpts, EP.WP_CONTRACT(id))
    }
  })

  test('[P3] REST API 建立合約 meta user_name 含 SQL injection 不應 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: '[E2E] sql-meta-test',
      status: CONTRACT_STATUS.PENDING,
      meta: { user_name: `[E2E] ${EDGE.SQL_INJECTION_1}` },
    })
    expect(res.status).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 組合攻擊：多欄位同時包含邊界值
  // ══════════════════════════════════════════════════════════════

  test('[P3] 所有欄位同時帶邊界值（XSS+Emoji+SQL+特殊字元）不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(
      request,
      nonce,
      ids.templateId,
      `[E2E] ${EDGE.XSS_SCRIPT}`,
      {
        user_address: EDGE.EMOJI_COMPLEX,
        user_phone: EDGE.SQL_INJECTION_1,
        user_identity: EDGE.SPECIAL_CHARS,
        contract_amount: String(EDGE.NEGATIVE_NUMBER),
        signature: `data:text/html;base64,${Buffer.from(EDGE.XSS_SCRIPT).toString('base64')}`,
      },
    )
    expect(res.status()).toBeLessThan(500)
  })

  test('[P3] user_name 為空字串不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, EDGE.EMPTY_STRING)
    expect(res.status()).toBeLessThan(500)
  })

  test('[P3] user_name 為純空白不應 500', async ({ request }) => {
    if (!ids.templateId) { test.skip(); return }

    const nonce = getNonce()
    const res = await postSignForm(request, nonce, ids.templateId, EDGE.WHITESPACE_ONLY)
    expect(res.status()).toBeLessThan(500)
  })
})
