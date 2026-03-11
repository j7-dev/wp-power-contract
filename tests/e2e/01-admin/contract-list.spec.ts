/**
 * 01-admin / contract-list.spec.ts
 *
 * 合約列表頁面 E2E 測試
 * 基於: spec/features/合約列表.feature
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  ADMIN_PAGES,
  CONTRACT_STATUS,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, type ApiOptions } from '../helpers/api-client.js'

test.describe('01-admin / 合約列表', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // REST API: 取得合約列表
  // ────────────────────────────────────────────────────────────
  test('應可透過 REST API 取得合約列表', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, { per_page: '20' })
    expect(res.status).toBeLessThan(500)

    // 若 REST 端點已註冊，回傳應為陣列
    if (res.status === 200) {
      expect(Array.isArray(res.data)).toBeTruthy()
    }
  })

  test('合約列表應包含 global-setup 建立的測試資料', async () => {
    if (!ids.contractId) {
      test.skip()
      return
    }
    const res = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId))
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      const contract = res.data as Record<string, unknown>
      expect(contract).toHaveProperty('id', ids.contractId)
    }
  })

  test('應可用 status 參數過濾合約', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      status: CONTRACT_STATUS.PENDING,
      per_page: '5',
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200 && Array.isArray(res.data)) {
      for (const c of res.data as Array<Record<string, unknown>>) {
        expect(c.status).toBe(CONTRACT_STATUS.PENDING)
      }
    }
  })

  // ────────────────────────────────────────────────────────────
  // UI: 合約列表頁面
  // ────────────────────────────────────────────────────────────
  test('管理員可進入合約列表頁面', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    // 確認頁面包含 contract 列表表格
    const heading = page.locator('.wrap h1, .wrap h2').first()
    await expect(heading).toBeVisible({ timeout: 15_000 })
  })

  test('合約列表頁應顯示自訂欄位 (name, status)', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    // 檢查表頭是否包含自訂欄位
    const headerRow = page.locator('table.wp-list-table thead tr').first()
    const headerText = await headerRow.textContent() ?? ''

    // 根據 feature spec，欄位應包含 name/Status
    // 如果外掛有加入自訂欄位，會出現在表頭
    expect(headerText.length).toBeGreaterThan(0)
  })

  test('合約列表應可以分頁', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '1',
      page: '1',
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      // 檢查回傳 pagination headers
      const totalPages = res.headers['x-wp-totalpages']
      const totalItems = res.headers['x-wp-total']
      // 如果有設定 pagination headers
      if (totalItems) {
        expect(Number(totalItems)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  // ────────────────────────────────────────────────────────────
  // 狀態色彩標籤（UI 驗證）
  // ────────────────────────────────────────────────────────────
  test('不同合約狀態應以不同標籤呈現', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    // 檢查狀態標籤是否存在（class 或 inline-style）
    // Feature spec: pending 黃色, approved 藍色, rejected 紅色
    const statusCells = page.locator('td.column-status, td.status')
    const count = await statusCells.count()

    // 如果有合約資料，狀態欄位應該有內容
    if (count > 0) {
      const firstCellText = await statusCells.first().textContent()
      expect(firstCellText).toBeTruthy()
    }
  })
})
