/**
 * 03-integration / data-boundary.spec.ts
 *
 * 資料邊界 E2E 測試 — XSS、SQL Injection、Unicode、特殊字元
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  AJAX_ACTION,
  EDGE,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

test.describe('03-integration / 資料邊界', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // XSS 防護 — AJAX create_contract
  // ────────────────────────────────────────────────────────────
  test('user_name 含 <script> XSS 應被過濾或不導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `[E2E] ${EDGE.XSS_SCRIPT}`)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)

    // 如果合約建立成功，檢查回傳內容不包含未轉義的 <script>
    const body = await res.json().catch(() => ({}))
    const bodyStr = JSON.stringify(body)
    if (body.success) {
      expect(bodyStr).not.toContain('<script>alert')
    }
  })

  test('user_name 含 <img onerror> XSS 應被過濾或不導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `[E2E] ${EDGE.XSS_IMG}`)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('user_address 含 <svg/onload> XSS 應被過濾或不導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] svg-xss-test')
    formData.set('user_address', EDGE.XSS_SVG)

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
  // SQL Injection 防護
  // ────────────────────────────────────────────────────────────
  test('user_name 含 SQL injection 字串不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `[E2E] ${EDGE.SQL_INJECTION_1}`)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('contract_template_id 含 SQL injection 不應導致 500', async ({ request }) => {
    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', EDGE.SQL_INJECTION_2)
    formData.set('user_name', '[E2E] sql-injection-template-id')

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('user_phone 含 SQL injection 不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] sql-phone-test')
    formData.set('user_phone', EDGE.SQL_INJECTION_3)

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
  // Unicode / 特殊字元
  // ────────────────────────────────────────────────────────────
  test('中文字元 user_name 應可正常處理', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `[E2E] ${EDGE.UNICODE_CJK}`)
    formData.set('user_address', `[E2E] ${EDGE.UNICODE_JAPANESE}路`)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('Emoji user_name 應可正常處理', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `[E2E] ${EDGE.EMOJI}`)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('複雜 Emoji（ZWJ 序列）應可正常處理', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `[E2E] ${EDGE.EMOJI_COMPLEX}`)

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
  // 空值 / 極端長度
  // ────────────────────────────────────────────────────────────
  test('空白 user_name 不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', EDGE.EMPTY_STRING)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('只有空白的 user_name 不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', EDGE.WHITESPACE_ONLY)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('超長 user_name (10000 字元) 不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `[E2E] ${EDGE.VERY_LONG_STRING}`)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('特殊字元 user_name 不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `[E2E] ${EDGE.SPECIAL_CHARS}`)

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('HTML 實體字元不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', `[E2E] ${EDGE.HTML_ENTITIES}`)

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
  // contract_amount 邊界
  // ────────────────────────────────────────────────────────────
  test('負數 contract_amount 不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] negative-amount-test')
    formData.set('contract_amount', String(EDGE.NEGATIVE_NUMBER))

    const res = await request.post(`${BASE_URL}${EP.AJAX}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WP-Nonce': nonce,
      },
      data: formData.toString(),
    })

    expect(res.status()).toBeLessThan(500)
  })

  test('超大數字 contract_amount 不應導致 500', async ({ request }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    const nonce = getNonce()
    const formData = new URLSearchParams()
    formData.set('action', AJAX_ACTION.CREATE_CONTRACT)
    formData.set('nonce', nonce)
    formData.set('contract_template_id', String(ids.templateId))
    formData.set('user_name', '[E2E] huge-amount-test')
    formData.set('contract_amount', String(EDGE.HUGE_NUMBER))

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
  // REST API XSS in contract title via REST
  // ────────────────────────────────────────────────────────────
  test('REST API 建立合約時 XSS title 應被過濾', async () => {
    const res = await wpPost(apiOpts, EP.WP_CONTRACTS, {
      title: `[E2E] ${EDGE.XSS_SCRIPT}`,
      status: 'pending',
      meta: { user_name: `[E2E] ${EDGE.XSS_SCRIPT}` },
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 201) {
      const contract = res.data as Record<string, unknown>
      const title = contract.title as Record<string, unknown>
      // WordPress 應過濾 <script> 標籤
      const renderedTitle = (title?.rendered as string) ?? ''
      expect(renderedTitle).not.toContain('<script>')
    }
  })
})
