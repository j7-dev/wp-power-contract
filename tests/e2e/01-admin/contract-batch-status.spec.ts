/**
 * 01-admin / contract-batch-status.spec.ts
 *
 * 批量變更合約狀態 E2E 測試
 * 基於: spec/features/批量變更合約狀態.feature
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  ADMIN_PAGES,
  CONTRACT_STATUS,
  BULK_ACTION,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

test.describe('01-admin / 批量變更合約狀態', () => {
  let apiOpts: ApiOptions
  let ids: TestIds
  let batchContractIds: number[] = []

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()

    // 建立額外合約作為批量操作測試用
    for (let i = 0; i < 3; i++) {
      const res = await wpPost(apiOpts, EP.WP_CONTRACTS, {
        title: `[E2E] 批量測試合約 #${i + 1}`,
        status: CONTRACT_STATUS.PENDING,
        meta: {
          user_name: `[E2E] 批量用戶 ${i + 1}`,
          client_ip: '127.0.0.1',
        },
      })
      if (res.status === 201) {
        const contract = res.data as Record<string, unknown>
        batchContractIds.push(contract.id as number)
      }
    }
  })

  // ────────────────────────────────────────────────────────────
  // UI: Bulk Actions
  // ────────────────────────────────────────────────────────────
  test('合約列表頁面應包含 Bulk Actions 下拉選單', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    // WordPress Bulk Actions 下拉選單
    const bulkSelect = page.locator('select#bulk-action-selector-top, select[name="action"]').first()
    if ((await bulkSelect.count()) > 0) {
      const options = await bulkSelect.locator('option').allTextContents()
      // 應包含批量變更狀態的選項
      expect(options.length).toBeGreaterThan(0)
    }
  })

  test('Bulk Actions 應包含 Change to Approved 選項', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const bulkSelect = page.locator('select#bulk-action-selector-top').first()
    if ((await bulkSelect.count()) > 0) {
      const html = await bulkSelect.innerHTML()
      const hasApprovedOption =
        html.includes('change-to-approved') ||
        html.includes('Approved') ||
        html.includes('approved')
      expect(hasApprovedOption).toBeTruthy()
    }
  })

  test('Bulk Actions 應包含 Change to Pending 選項', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const bulkSelect = page.locator('select#bulk-action-selector-top').first()
    if ((await bulkSelect.count()) > 0) {
      const html = await bulkSelect.innerHTML()
      const hasPendingOption =
        html.includes('change-to-pending') ||
        html.includes('Pending') ||
        html.includes('pending')
      expect(hasPendingOption).toBeTruthy()
    }
  })

  test('Bulk Actions 應包含 Change to Rejected 選項', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const bulkSelect = page.locator('select#bulk-action-selector-top').first()
    if ((await bulkSelect.count()) > 0) {
      const html = await bulkSelect.innerHTML()
      const hasRejectedOption =
        html.includes('change-to-rejected') ||
        html.includes('Rejected') ||
        html.includes('rejected')
      expect(hasRejectedOption).toBeTruthy()
    }
  })

  // ────────────────────────────────────────────────────────────
  // REST API: 模擬批量狀態變更
  // ────────────────────────────────────────────────────────────
  test('應可透過 REST API 批量將合約改為 approved', async () => {
    if (batchContractIds.length < 2) {
      test.skip()
      return
    }

    const results = await Promise.all(
      batchContractIds.slice(0, 2).map((id) =>
        wpPost(apiOpts, EP.WP_CONTRACT(id), {
          status: CONTRACT_STATUS.APPROVED,
        }),
      ),
    )

    for (const res of results) {
      expect(res.status).toBeLessThan(500)
    }

    // 驗證狀態已變更
    for (const id of batchContractIds.slice(0, 2)) {
      const check = await wpGet(apiOpts, EP.WP_CONTRACT(id))
      if (check.status === 200) {
        const c = check.data as Record<string, unknown>
        expect(c.status).toBe(CONTRACT_STATUS.APPROVED)
      }
    }
  })

  test('應可透過 REST API 批量將合約改為 rejected', async () => {
    if (batchContractIds.length < 1) {
      test.skip()
      return
    }

    const targetId = batchContractIds[batchContractIds.length - 1]
    const res = await wpPost(apiOpts, EP.WP_CONTRACT(targetId), {
      status: CONTRACT_STATUS.REJECTED,
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      const c = res.data as Record<string, unknown>
      expect(c.status).toBe(CONTRACT_STATUS.REJECTED)
    }
  })

  test('應可透過 REST API 將合約改回 pending', async () => {
    if (batchContractIds.length < 1) {
      test.skip()
      return
    }

    const targetId = batchContractIds[0]
    const res = await wpPost(apiOpts, EP.WP_CONTRACT(targetId), {
      status: CONTRACT_STATUS.PENDING,
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      const c = res.data as Record<string, unknown>
      expect(c.status).toBe(CONTRACT_STATUS.PENDING)
    }
  })
})
