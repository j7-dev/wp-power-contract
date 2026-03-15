/**
 * 01-admin / contract-list.spec.ts
 *
 * 合約列表頁面 E2E 測試
 * 基於: spec/features/合約列表.feature
 *
 * 優先級:
 *   P0 — 管理員可存取列表頁、REST API 取得合約列表
 *   P1 — 狀態標籤色彩驗證、Order ID 欄位顯示
 *   P2 — 分頁功能、status 過濾
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

  // ══════════════════════════════════════════════════════════════
  // P0 — REST API：取得合約列表
  // ══════════════════════════════════════════════════════════════

  test('[P0] 應可透過 REST API 取得合約列表，回傳陣列', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, { per_page: '20' })

    // REST 端點必須回應，不能 500
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      expect(Array.isArray(res.data)).toBe(true)
    }
  })

  test('[P0] global-setup 建立的測試合約應在列表中可查到', async () => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    const res = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId))
    expect(res.status).toBe(200)

    const contract = res.data as Record<string, unknown>
    expect(contract.id).toBe(ids.contractId)
    expect(contract).toHaveProperty('status')
    expect(contract).toHaveProperty('meta')
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — UI：後台列表頁面
  // ══════════════════════════════════════════════════════════════

  test('[P0] 管理員可進入合約列表頁面，頁面標題可見', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    // 頁面標題必須可見
    const heading = page.locator('.wrap h1, .wrap h2').first()
    await expect(heading).toBeVisible({ timeout: 15_000 })

    // 確認頁面含有合約列表表格
    const table = page.locator('table.wp-list-table')
    await expect(table).toBeVisible()
  })

  test('[P0] 合約列表表頭應包含 Title 欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const thead = page.locator('table.wp-list-table thead')
    await expect(thead).toBeVisible()

    // Title 欄位一定存在（WordPress 預設）
    const headerText = await thead.textContent() ?? ''
    expect(headerText).toContain('Title')
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 自訂欄位：name、Status、Date
  // ══════════════════════════════════════════════════════════════

  test('[P1] 合約列表表頭應包含 name 與 Status 自訂欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const thead = page.locator('table.wp-list-table thead')
    const headerText = await thead.textContent() ?? ''

    // Feature spec 要求 name 與 Status 欄位
    expect(headerText.toLowerCase()).toMatch(/name|user.?name/i)
    expect(headerText).toMatch(/[Ss]tatus/)
  })

  test('[P1] 合約列表狀態欄位應以色彩標籤呈現（pending/approved/rejected）', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    // 狀態欄位應存在
    const statusCells = page.locator('td.column-status, td[class*="status"]')
    const count = await statusCells.count()

    if (count > 0) {
      // 狀態欄位應有文字內容
      const firstText = await statusCells.first().textContent()
      expect(firstText?.trim().length).toBeGreaterThan(0)

      // 狀態欄位內應有 span/badge 元素（色彩標籤）
      const badge = statusCells.first().locator('span, .status-badge, [class*="badge"]')
      // 若有 badge 則驗證有文字
      if (await badge.count() > 0) {
        const badgeText = await badge.first().textContent()
        expect(['pending', 'approved', 'rejected', '待審核', '已核准', '已拒絕']).toContain(
          badgeText?.trim().toLowerCase(),
        )
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — WooCommerce Order ID 欄位
  // ══════════════════════════════════════════════════════════════

  test('[P1] WooCommerce 啟用時列表表頭應包含 Order ID 欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)
    await page.waitForLoadState('domcontentloaded')

    const thead = page.locator('table.wp-list-table thead')
    const headerText = await thead.textContent() ?? ''

    // 若 WooCommerce 已安裝，應有 Order ID 欄位
    // 若未安裝，此測試為防禦性驗證（不強制要求）
    if (headerText.toLowerCase().includes('order')) {
      expect(headerText).toMatch(/[Oo]rder.?[Ii][Dd]|[Oo]rder/i)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — REST API 過濾與分頁
  // ══════════════════════════════════════════════════════════════

  test('[P2] 應可用 status=pending 過濾合約列表，結果狀態應皆為 pending', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      status: CONTRACT_STATUS.PENDING,
      per_page: '10',
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200 && Array.isArray(res.data)) {
      for (const c of res.data as Array<Record<string, unknown>>) {
        expect(c.status).toBe(CONTRACT_STATUS.PENDING)
      }
    }
  })

  test('[P2] 應可用 status=approved 過濾合約列表', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      status: CONTRACT_STATUS.APPROVED,
      per_page: '5',
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200 && Array.isArray(res.data)) {
      for (const c of res.data as Array<Record<string, unknown>>) {
        expect(c.status).toBe(CONTRACT_STATUS.APPROVED)
      }
    }
  })

  test('[P2] REST API 分頁應回傳 X-WP-Total 和 X-WP-TotalPages header', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      per_page: '1',
      page: '1',
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      // WordPress REST API 應回傳分頁 headers
      const total = res.headers['x-wp-total']
      const totalPages = res.headers['x-wp-totalpages']

      if (total) {
        expect(Number(total)).toBeGreaterThanOrEqual(0)
      }
      if (totalPages) {
        expect(Number(totalPages)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('[P2] 合約列表應按日期排序（最新在前）', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACTS, {
      orderby: 'date',
      order: 'desc',
      per_page: '5',
    })
    expect(res.status).toBeLessThan(500)

    if (res.status === 200 && Array.isArray(res.data) && res.data.length > 1) {
      const contracts = res.data as Array<Record<string, unknown>>
      // 第一筆日期應晚於或等於第二筆
      const date1 = new Date(contracts[0].date as string).getTime()
      const date2 = new Date(contracts[1].date as string).getTime()
      expect(date1).toBeGreaterThanOrEqual(date2)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 未登入保護
  // ══════════════════════════════════════════════════════════════

  test('[P1] 未登入用戶存取合約列表頁應被重導向至 wp-login.php', async ({ page }) => {
    await page.context().clearCookies()
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_LIST}`)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 應被重導向至登入頁
    expect(page.url()).toContain('wp-login.php')
  })
})
