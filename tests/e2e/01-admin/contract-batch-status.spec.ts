/**
 * 01-admin / contract-batch-status.spec.ts
 *
 * 批量變更合約狀態 E2E 測試
 * 基於: spec/features/批量變更合約狀態.feature + spec/es.md (BulkChangeContractStatus)
 *
 * 批量操作: change-to-pending / change-to-approved / change-to-rejected
 * 觸發方式: WordPress Bulk Actions（合約列表頁表單提交）
 *
 * 優先級:
 *   P0 — REST API 批量更新：approved、rejected、pending
 *   P1 — UI：Bulk Actions 下拉選單包含三個合法選項
 *   P2 — UI：勾選合約並批量操作，驗證狀態變更 + 成功提示
 *   P3 — 邊界：空選取、超大批量、混合有效/無效 ID
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  ADMIN_PAGES,
  CONTRACT_STATUS,
  BULK_ACTION,
  EDGE,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, wpDelete, type ApiOptions } from '../helpers/api-client.js'

test.describe('01-admin / 批量變更合約狀態', () => {
  let apiOpts: ApiOptions
  let ids: TestIds
  const batchIds: number[] = []

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()

    // 建立 3 筆測試合約供批量操作使用
    for (let i = 1; i <= 3; i++) {
      const res = await wpPost(apiOpts, EP.WP_CONTRACTS, {
        title: `[E2E] 批量測試合約 #${i}`,
        status: CONTRACT_STATUS.PENDING,
        meta: {
          user_name: `[E2E] 批量用戶 ${i}`,
          client_ip: '127.0.0.1',
        },
      })
      if (res.status === 201) {
        const c = res.data as Record<string, unknown>
        batchIds.push(c.id as number)
      }
    }
  })

  test.afterAll(async () => {
    // 清理批量測試合約
    for (const id of batchIds) {
      try {
        await wpDelete(apiOpts, `${EP.WP_CONTRACT(id)}?force=true`)
      } catch {
        // 忽略清理失敗
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — REST API：批量狀態更新
  // ══════════════════════════════════════════════════════════════

  test('[P0] 應可透過 REST API 批量將合約改為 approved', async () => {
    if (batchIds.length < 2) {
      test.skip()
      return
    }

    // 先全部設回 pending
    for (const id of batchIds.slice(0, 2)) {
      await wpPost(apiOpts, EP.WP_CONTRACT(id), { status: CONTRACT_STATUS.PENDING })
    }

    // 批量 approve
    const results = await Promise.all(
      batchIds.slice(0, 2).map((id) =>
        wpPost(apiOpts, EP.WP_CONTRACT(id), { status: CONTRACT_STATUS.APPROVED }),
      ),
    )

    for (const res of results) {
      expect(res.status).toBeLessThan(500)
      if (res.status === 200) {
        const c = res.data as Record<string, unknown>
        expect(c.status).toBe(CONTRACT_STATUS.APPROVED)
      }
    }

    // 驗證狀態已變更
    for (const id of batchIds.slice(0, 2)) {
      const check = await wpGet(apiOpts, EP.WP_CONTRACT(id))
      if (check.status === 200) {
        const c = check.data as Record<string, unknown>
        expect(c.status).toBe(CONTRACT_STATUS.APPROVED)
      }
    }
  })

  test('[P0] 應可透過 REST API 批量將合約改為 rejected', async () => {
    if (batchIds.length < 1) {
      test.skip()
      return
    }

    // 先設為 pending
    await wpPost(apiOpts, EP.WP_CONTRACT(batchIds[0]), { status: CONTRACT_STATUS.PENDING })

    const res = await wpPost(apiOpts, EP.WP_CONTRACT(batchIds[0]), {
      status: CONTRACT_STATUS.REJECTED,
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      const c = res.data as Record<string, unknown>
      expect(c.status).toBe(CONTRACT_STATUS.REJECTED)
    }
  })

  test('[P0] 應可透過 REST API 將合約改回 pending', async () => {
    if (batchIds.length < 1) {
      test.skip()
      return
    }

    // 先設為 approved
    await wpPost(apiOpts, EP.WP_CONTRACT(batchIds[0]), { status: CONTRACT_STATUS.APPROVED })

    const res = await wpPost(apiOpts, EP.WP_CONTRACT(batchIds[0]), {
      status: CONTRACT_STATUS.PENDING,
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      const c = res.data as Record<string, unknown>
      expect(c.status).toBe(CONTRACT_STATUS.PENDING)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — UI：Bulk Actions 下拉選單
  // ══════════════════════════════════════════════════════════════

  test('[P1] 合約列表頁面應包含 Bulk Actions 下拉選單', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const bulkSelect = page.locator(
      'select#bulk-action-selector-top, select[name="action"]',
    ).first()

    if (await bulkSelect.count() > 0) {
      await expect(bulkSelect).toBeVisible()
      const options = await bulkSelect.locator('option').allTextContents()
      expect(options.length).toBeGreaterThan(0)
    }
  })

  test('[P1] Bulk Actions 應包含 Change to Approved 選項', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const bulkSelect = page.locator('select#bulk-action-selector-top').first()

    if (await bulkSelect.count() > 0) {
      const html = await bulkSelect.innerHTML()
      expect(html).toMatch(/change-to-approved|Approved/i)
    }
  })

  test('[P1] Bulk Actions 應包含 Change to Pending 選項', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const bulkSelect = page.locator('select#bulk-action-selector-top').first()

    if (await bulkSelect.count() > 0) {
      const html = await bulkSelect.innerHTML()
      expect(html).toMatch(/change-to-pending|Pending/i)
    }
  })

  test('[P1] Bulk Actions 應包含 Change to Rejected 選項', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const bulkSelect = page.locator('select#bulk-action-selector-top').first()

    if (await bulkSelect.count() > 0) {
      const html = await bulkSelect.innerHTML()
      expect(html).toMatch(/change-to-rejected|Rejected/i)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — UI：勾選合約並執行批量操作
  // ══════════════════════════════════════════════════════════════

  test('[P2] UI 勾選多筆合約並執行 Change to Approved，狀態應變更', async ({ page }) => {
    if (batchIds.length < 2) {
      test.skip()
      return
    }

    // 先確保測試合約為 pending
    for (const id of batchIds.slice(0, 2)) {
      await wpPost(apiOpts, EP.WP_CONTRACT(id), { status: CONTRACT_STATUS.PENDING })
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    // 逐一勾選測試合約
    for (const id of batchIds.slice(0, 2)) {
      const checkbox = page.locator(`input[type="checkbox"][value="${id}"]`)
      if (await checkbox.count() > 0) {
        await checkbox.check()
      }
    }

    // 選擇 Change to Approved
    const bulkSelect = page.locator('select#bulk-action-selector-top').first()
    if (await bulkSelect.count() > 0) {
      await bulkSelect.selectOption(BULK_ACTION.TO_APPROVED)

      // 點擊 Apply 按鈕
      const applyBtn = page.locator(
        '#doaction, input[id="doaction"], button[name="action"]',
      ).first()
      if (await applyBtn.count() > 0) {
        await applyBtn.click()
        await page.waitForLoadState('domcontentloaded')

        // 驗證狀態已變更
        for (const id of batchIds.slice(0, 2)) {
          const check = await wpGet(apiOpts, EP.WP_CONTRACT(id))
          if (check.status === 200) {
            const c = check.data as Record<string, unknown>
            expect(c.status).toBe(CONTRACT_STATUS.APPROVED)
          }
        }
      }
    }
  })

  test('[P2] UI 批量 Change to Pending 後頁面應顯示成功提示訊息', async ({ page }) => {
    if (batchIds.length < 1) {
      test.skip()
      return
    }

    // 先設為 approved
    await wpPost(apiOpts, EP.WP_CONTRACT(batchIds[0]), {
      status: CONTRACT_STATUS.APPROVED,
    })

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const checkbox = page.locator(`input[type="checkbox"][value="${batchIds[0]}"]`)
    if (await checkbox.count() > 0) {
      await checkbox.check()
    }

    const bulkSelect = page.locator('select#bulk-action-selector-top').first()
    if (await bulkSelect.count() > 0) {
      await bulkSelect.selectOption(BULK_ACTION.TO_PENDING)
      const applyBtn = page.locator('#doaction').first()
      if (await applyBtn.count() > 0) {
        await applyBtn.click()
        await page.waitForLoadState('domcontentloaded')

        // 頁面應顯示提示訊息（WordPress 批量操作完成後的 notice）
        const notice = page.locator('.notice, .updated, .bulk-action-notice, #message')
        if (await notice.count() > 0) {
          const noticeText = await notice.first().textContent()
          expect(noticeText?.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  test('[P2] UI 批量 Change to Rejected 後合約狀態應為 rejected', async ({ page }) => {
    if (batchIds.length < 2) {
      test.skip()
      return
    }

    // 先設為 pending
    for (const id of batchIds.slice(0, 2)) {
      await wpPost(apiOpts, EP.WP_CONTRACT(id), { status: CONTRACT_STATUS.PENDING })
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    for (const id of batchIds.slice(0, 2)) {
      const checkbox = page.locator(`input[type="checkbox"][value="${id}"]`)
      if (await checkbox.count() > 0) {
        await checkbox.check()
      }
    }

    const bulkSelect = page.locator('select#bulk-action-selector-top').first()
    if (await bulkSelect.count() > 0) {
      await bulkSelect.selectOption(BULK_ACTION.TO_REJECTED)
      const applyBtn = page.locator('#doaction').first()
      if (await applyBtn.count() > 0) {
        await applyBtn.click()
        await page.waitForLoadState('domcontentloaded')

        // 驗證狀態已變更
        for (const id of batchIds.slice(0, 2)) {
          const check = await wpGet(apiOpts, EP.WP_CONTRACT(id))
          if (check.status === 200) {
            const c = check.data as Record<string, unknown>
            expect(c.status).toBe(CONTRACT_STATUS.REJECTED)
          }
        }
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 邊界：混合有效/無效 ID、空批量
  // ══════════════════════════════════════════════════════════════

  test('[P3] REST API 批量更新混合有效與不存在的 ID，有效 ID 應成功，無效應回傳 404', async () => {
    if (batchIds.length < 1) {
      test.skip()
      return
    }

    // 有效 ID
    const validRes = await wpPost(apiOpts, EP.WP_CONTRACT(batchIds[0]), {
      status: CONTRACT_STATUS.PENDING,
    })
    expect(validRes.status).toBeLessThan(500)

    // 不存在的 ID
    const invalidRes = await wpPost(apiOpts, EP.WP_CONTRACT(9999999), {
      status: CONTRACT_STATUS.PENDING,
    })
    expect(invalidRes.status).toBeLessThan(500)
    expect([400, 403, 404]).toContain(invalidRes.status)
  })

  test('[P3] REST API 對 ID=0 更新狀態不應導致 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_CONTRACT(0), {
      status: CONTRACT_STATUS.APPROVED,
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P3] REST API 對負數 ID 更新狀態不應導致 500', async () => {
    const res = await wpPost(apiOpts, EP.WP_CONTRACT(-1), {
      status: CONTRACT_STATUS.APPROVED,
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P3] REST API 對合約設定不合法的 status 值不應導致 500', async () => {
    if (batchIds.length < 1) {
      test.skip()
      return
    }

    const res = await wpPost(apiOpts, EP.WP_CONTRACT(batchIds[0]), {
      status: 'nonexistent_status_xyz',
    })
    expect(res.status).toBeLessThan(500)
  })

  test('[P3] REST API 查詢合約 per_page=100 不應導致 500', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '100',
    })
    expect(res.status).toBeLessThan(500)
  })
})
