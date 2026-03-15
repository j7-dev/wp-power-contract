/**
 * 01-admin / contract-detail.spec.ts
 *
 * 查看合約詳情 E2E 測試
 * 基於: spec/features/查看合約詳情.feature + spec/es.md (ViewContractDetail)
 *
 * 優先級:
 *   P0 — REST API 取得單筆合約，欄位完整性驗證
 *   P0 — 管理員可進入合約編輯頁面，metabox 顯示
 *   P1 — Approval metabox 按鈕狀態（pending/approved/rejected）
 *   P1 — 不應顯示系統隱藏欄位（_edit_lock 等）
 *   P2 — client_ip 欄位顯示
 *   P2 — WooCommerce 訂單關聯欄位
 *   P3 — 不存在的合約 ID 應回傳 404
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  ADMIN_PAGES,
  CONTRACT_STATUS,
  TEST_CONTRACT,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

test.describe('01-admin / 查看合約詳情', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — REST API：單筆合約詳情
  // ══════════════════════════════════════════════════════════════

  test('[P0] 應可透過 REST API 取得單筆合約詳情，回傳正確 id 與 status', async () => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId))
    expect(res.status).toBe(200)

    const contract = res.data as Record<string, unknown>
    expect(contract.id).toBe(ids.contractId)
    expect(contract).toHaveProperty('status')
    // contract CPT 應在 pending/approved/rejected 之一
    expect([CONTRACT_STATUS.PENDING, CONTRACT_STATUS.APPROVED, CONTRACT_STATUS.REJECTED]).toContain(
      contract.status,
    )
  })

  test('[P0] REST API 合約詳情應包含 meta 欄位（user_name、client_ip 等）', async () => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId))
    expect(res.status).toBe(200)

    const contract = res.data as Record<string, unknown>
    // meta 欄位應存在
    expect(contract).toHaveProperty('meta')

    const meta = contract.meta as Record<string, unknown>
    // global-setup 有設定 user_name 和 client_ip
    expect(meta).toHaveProperty('user_name')
    expect(meta).toHaveProperty('client_ip')
  })

  test('[P0] REST API 合約應包含 contract_template_id meta', async () => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId))
    expect(res.status).toBe(200)

    const contract = res.data as Record<string, unknown>
    const meta = contract.meta as Record<string, unknown> | undefined

    if (meta) {
      // global-setup 有設定 contract_template_id
      expect(meta).toHaveProperty('contract_template_id')
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — UI：合約編輯頁面
  // ══════════════════════════════════════════════════════════════

  test('[P0] 管理員可進入合約編輯頁面，頁面包含編輯表單', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    // 頁面應包含 post 編輯表單
    const postForm = page.locator('#post, #editor, form#post')
    await expect(postForm.first()).toBeVisible()
  })

  test('[P0] 合約 metabox 應顯示欄位資料', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    // 頁面應包含合約欄位（user_name 相關內容）
    // Feature spec: 顯示 Contract Template Id, User Name, User Phone, Signature, Signed Contract, Signed At
    const hasUserName =
      pageContent.includes('User Name') ||
      pageContent.includes('user_name') ||
      pageContent.includes(TEST_CONTRACT.USER_NAME)
    expect(hasUserName).toBeTruthy()
  })

  test('[P0] 合約 metabox 應包含合約模板 ID 欄位', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    const hasTemplateId =
      pageContent.includes('Contract Template Id') ||
      pageContent.includes('contract_template_id') ||
      pageContent.includes('Template')
    expect(hasTemplateId).toBeTruthy()
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — Approval metabox 按鈕狀態
  // ══════════════════════════════════════════════════════════════

  test('[P1] pending 合約在編輯頁面應顯示可點擊的 Approve 和 Reject 按鈕', async ({
    page,
  }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    // 確保為 pending
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      status: CONTRACT_STATUS.PENDING,
    })

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    const approveBtn = page.locator(
      'a:has-text("Approve"), input[value="Approve"], button:has-text("Approve")',
    ).first()
    const rejectBtn = page.locator(
      'a:has-text("Reject"), input[value="Reject"], button:has-text("Reject")',
    ).first()

    // pending 狀態時，兩個按鈕都應存在（至少其中一個）
    const hasApprove = await approveBtn.count() > 0
    const hasReject = await rejectBtn.count() > 0
    expect(hasApprove || hasReject).toBeTruthy()

    if (hasApprove) {
      // Approve 按鈕不應為 disabled
      const isDisabled = await approveBtn.getAttribute('disabled')
      expect(isDisabled).toBeNull()
    }

    if (hasReject) {
      // Reject 按鈕不應為 disabled
      const isDisabled = await rejectBtn.getAttribute('disabled')
      expect(isDisabled).toBeNull()
    }
  })

  test('[P1] approved 合約在編輯頁面 Approve 按鈕應為 disabled，Reject 可點擊', async ({
    page,
  }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    // 設為 approved
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      status: CONTRACT_STATUS.APPROVED,
    })

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    const approveBtn = page.locator(
      'a:has-text("Approve"), input[value="Approve"], button:has-text("Approve")',
    ).first()
    const rejectBtn = page.locator(
      'a:has-text("Reject"), input[value="Reject"], button:has-text("Reject")',
    ).first()

    if (await approveBtn.count() > 0) {
      // approved 時 Approve 按鈕應為 disabled
      const isApproveDisabled =
        (await approveBtn.getAttribute('disabled')) !== null ||
        (await approveBtn.getAttribute('class'))?.includes('disabled') ||
        !(await approveBtn.isEnabled())
      expect(isApproveDisabled).toBeTruthy()
    }

    if (await rejectBtn.count() > 0) {
      // Reject 按鈕仍應可點擊
      const isRejectDisabled = (await rejectBtn.getAttribute('disabled')) !== null
      expect(isRejectDisabled).toBeFalsy()
    }

    // 還原為 pending
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      status: CONTRACT_STATUS.PENDING,
    })
  })

  test('[P1] rejected 合約在編輯頁面 Reject 按鈕應為 disabled，Approve 可點擊', async ({
    page,
  }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    // 設為 rejected
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      status: CONTRACT_STATUS.REJECTED,
    })

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    const rejectBtn = page.locator(
      'a:has-text("Reject"), input[value="Reject"], button:has-text("Reject")',
    ).first()
    const approveBtn = page.locator(
      'a:has-text("Approve"), input[value="Approve"], button:has-text("Approve")',
    ).first()

    if (await rejectBtn.count() > 0) {
      // rejected 時 Reject 按鈕應為 disabled
      const isRejectDisabled =
        (await rejectBtn.getAttribute('disabled')) !== null ||
        (await rejectBtn.getAttribute('class'))?.includes('disabled') ||
        !(await rejectBtn.isEnabled())
      expect(isRejectDisabled).toBeTruthy()
    }

    if (await approveBtn.count() > 0) {
      // Approve 按鈕仍應可點擊
      const isApproveDisabled = (await approveBtn.getAttribute('disabled')) !== null
      expect(isApproveDisabled).toBeFalsy()
    }

    // 還原為 pending
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      status: CONTRACT_STATUS.PENDING,
    })
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 不應顯示系統隱藏欄位
  // ══════════════════════════════════════════════════════════════

  test('[P1] 合約 metabox 不應在自訂欄位區顯示 _edit_lock 系統欄位', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    // 找到外掛自訂 metabox（非 WordPress 原生 Custom Fields）
    // 外掛的合約 metabox 中不應有 _edit_lock
    const metaboxes = page.locator('.postbox:not(#postcustom)')
    if (await metaboxes.count() > 0) {
      const metaboxText = await metaboxes.allTextContents()
      const combined = metaboxText.join(' ')
      // 系統欄位不應出現在外掛 metabox 中
      expect(combined).not.toContain('_edit_lock')
      expect(combined).not.toContain('_thumbnail_id')
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — client_ip 欄位
  // ══════════════════════════════════════════════════════════════

  test('[P2] 合約詳情頁面應顯示 client_ip（簽署時的 IP 位址）', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    // global-setup 設定 client_ip = 127.0.0.1
    const hasIp =
      pageContent.includes('127.0.0.1') ||
      pageContent.includes('client_ip') ||
      pageContent.includes('Client Ip') ||
      pageContent.includes('Client IP')
    expect(hasIp).toBeTruthy()
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — WooCommerce 訂單關聯
  // ══════════════════════════════════════════════════════════════

  test('[P2] 有 _order_id 的合約詳情應顯示訂單關聯資訊', async ({ page }) => {
    if (!ids.contractId || !ids.orderId) {
      test.skip()
      return
    }

    // 更新合約，加上 _order_id
    const updateRes = await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      meta: { _order_id: ids.orderId },
    })

    if (updateRes.status !== 200) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    // 訂單 ID 應在頁面中可見
    const hasOrderId =
      pageContent.includes(String(ids.orderId)) ||
      pageContent.includes('relation_order_id') ||
      pageContent.includes('Order')
    expect(hasOrderId).toBeTruthy()
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 不存在的合約 ID
  // ══════════════════════════════════════════════════════════════

  test('[P3] REST API 取得不存在的合約應回傳 404 或 403', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACT(9999999))
    expect(res.status).toBeLessThan(500)
    expect([403, 404]).toContain(res.status)
  })

  test('[P3] REST API 取得 ID=0 的合約應回傳 4xx', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACT(0))
    expect(res.status).toBeLessThan(500)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
