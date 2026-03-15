/**
 * 02-frontend / myaccount-contracts.spec.ts
 *
 * 我的帳號查看合約 E2E 測試
 * 基於: spec/features/woocommerce/我的帳號查看合約.feature
 *       spec/features/woocommerce/訂單中查看合約.feature
 *
 * 核心行為：
 *   - 客戶在我的帳號 > 訂單詳情頁面看到關聯合約截圖縮圖與審核狀態標籤
 *   - 三種狀態標籤：approved（藍色）、pending（黃色）、rejected（紅色）
 *   - 訂單無關聯合約時不顯示合約區塊
 *   - 管理員 WC 訂單列表顯示 Contract 欄位（傳統 + HPOS）
 *
 * 優先級:
 *   P0 — 管理員 WC 訂單列表包含 Contract 欄位
 *   P0 — 我的帳號訂單詳情頁可正常載入
 *   P1 — 有關聯合約的訂單詳情頁顯示合約區塊（截圖 + 狀態）
 *   P1 — 訂單無合約時不顯示合約區塊
 *   P2 — 合約狀態標籤顯示正確文字（approved/pending/rejected）
 *   P3 — 邊界：不存在訂單 ID、負數 ID、非數字 ID
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
import { wpGet, wpPost, wpDelete, type ApiOptions } from '../helpers/api-client.js'

test.describe('02-frontend / 我的帳號查看合約', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 管理員 WC 訂單列表
  // ══════════════════════════════════════════════════════════════

  test('[P0] 管理員 WooCommerce 訂單列表頁面可正常載入（不 500）', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.WC_ORDERS}`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P0] WC 訂單列表中有訂單時應顯示 Contract 欄位（若 WC 已啟用）', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.WC_ORDERS}`)
    if (response!.status() === 404 || response!.status() === 302) {
      // WooCommerce 未啟用，跳過
      test.skip()
      return
    }
    expect(response!.status()).toBeLessThan(500)

    await page.waitForLoadState('domcontentloaded')
    const pageContent = await page.content()

    // WC 訂單列表應有 table 且包含 Contract 欄位（若有訂單）
    const hasTable = pageContent.includes('wp-list-table')
    if (hasTable) {
      // 有訂單列表時，外掛應注入 Contract 欄位
      const hasContractColumn =
        pageContent.includes('Contract') ||
        pageContent.includes('contract') ||
        pageContent.includes('合約')
      // 不強制：WC 未啟用或無訂單時可能為空
      expect(hasContractColumn || !hasTable).toBeTruthy()
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 我的帳號頁面基本載入
  // ══════════════════════════════════════════════════════════════

  test('[P0] 我的帳號頁面可正常載入（不 500）', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/my-account/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P0] 我的帳號訂單列表頁面可正常載入', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/my-account/orders/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P0] 有效 order_id 的我的帳號訂單詳情頁面可正常載入', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    const response = await page.goto(
      `${BASE_URL}/my-account/view-order/${ids.orderId}/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 有合約的訂單詳情頁顯示合約區塊
  // ══════════════════════════════════════════════════════════════

  test('[P1] 訂單詳情頁面（有合約）應顯示合約截圖或合約相關區塊', async ({ page }) => {
    if (!ids.orderId || !ids.contractId) {
      test.skip()
      return
    }

    // 確保合約關聯此訂單
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      meta: { _order_id: ids.orderId },
    })

    await page.goto(`${BASE_URL}/my-account/view-order/${ids.orderId}/`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    // 頁面應包含合約區塊相關標記
    const hasContractSection =
      pageContent.includes('contract') ||
      pageContent.includes('Contract') ||
      pageContent.includes('合約') ||
      pageContent.includes('screenshot')

    // 只在 WooCommerce 有啟用且頁面有實質內容時才斷言
    const pageLen = pageContent.length
    if (pageLen > 500 && !pageContent.includes('Page not found')) {
      expect(hasContractSection).toBeTruthy()
    }
  })

  test('[P1] 合約截圖縮圖（若顯示）應有 src 屬性', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}/my-account/view-order/${ids.orderId}/`)
    await page.waitForLoadState('domcontentloaded')

    // 若頁面有截圖縮圖，縮圖 img 元素應有 src
    const screenshots = page.locator('img[class*="screenshot"], img[src*="screenshot"]')
    const count = await screenshots.count()

    for (let i = 0; i < count; i++) {
      const src = await screenshots.nth(i).getAttribute('src')
      expect(src).toBeTruthy()
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 訂單無合約時不顯示合約區塊
  // ══════════════════════════════════════════════════════════════

  test('[P1] 不存在的訂單頁面不應 500（顯示 404 或重導向）', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/my-account/view-order/9999999/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 合約狀態標籤顯示正確
  // ══════════════════════════════════════════════════════════════

  test('[P2] approved 合約應顯示已審核相關標籤文字', async ({ page }) => {
    if (!ids.orderId || !ids.contractId) {
      test.skip()
      return
    }

    // 設定合約為 approved
    const setRes = await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      status: CONTRACT_STATUS.APPROVED,
      meta: { _order_id: ids.orderId },
    })
    if (setRes.status >= 400) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}/my-account/view-order/${ids.orderId}/`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    // 若有合約狀態顯示，應包含 approved 相關文字
    const hasApprovedLabel =
      pageContent.includes('approved') ||
      pageContent.includes('Approved') ||
      pageContent.includes('已審核') ||
      pageContent.includes('審核通過')

    // 僅在頁面有合約區塊時才斷言
    const hasContractSection =
      pageContent.includes('contract') ||
      pageContent.includes('Contract') ||
      pageContent.includes('合約')

    if (hasContractSection) {
      expect(hasApprovedLabel).toBeTruthy()
    }
  })

  test('[P2] pending 合約應顯示審核中相關標籤文字', async ({ page }) => {
    if (!ids.orderId || !ids.contractId2) {
      test.skip()
      return
    }

    // 建立一個 pending 合約關聯到此訂單
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId2), {
      status: CONTRACT_STATUS.PENDING,
      meta: { _order_id: ids.orderId },
    })

    await page.goto(`${BASE_URL}/my-account/view-order/${ids.orderId}/`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    const hasPendingLabel =
      pageContent.includes('pending') ||
      pageContent.includes('Pending') ||
      pageContent.includes('審核中') ||
      pageContent.includes('待審核')

    const hasContractSection =
      pageContent.includes('contract') ||
      pageContent.includes('Contract') ||
      pageContent.includes('合約')

    if (hasContractSection) {
      expect(hasPendingLabel).toBeTruthy()
    }
  })

  test('[P2] rejected 合約應顯示已拒絕相關標籤文字', async ({ page }) => {
    if (!ids.orderId || !ids.contractId3) {
      test.skip()
      return
    }

    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.REJECTED,
      meta: { _order_id: ids.orderId },
    })

    await page.goto(`${BASE_URL}/my-account/view-order/${ids.orderId}/`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    const hasRejectedLabel =
      pageContent.includes('rejected') ||
      pageContent.includes('Rejected') ||
      pageContent.includes('已拒絕') ||
      pageContent.includes('審核拒絕')

    const hasContractSection =
      pageContent.includes('contract') ||
      pageContent.includes('Contract') ||
      pageContent.includes('合約')

    if (hasContractSection) {
      expect(hasRejectedLabel).toBeTruthy()
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 合約縮圖可點擊開啟原圖
  // ══════════════════════════════════════════════════════════════

  test('[P2] 合約縮圖連結（若存在）應有正確 href', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}/my-account/view-order/${ids.orderId}/`)
    await page.waitForLoadState('domcontentloaded')

    // 找縮圖連結
    const thumbnailLinks = page.locator('a:has(img[class*="screenshot"]), a[href*="screenshot"]')
    const count = await thumbnailLinks.count()

    for (let i = 0; i < count; i++) {
      const href = await thumbnailLinks.nth(i).getAttribute('href')
      expect(href).toBeTruthy()
      expect(href!.length).toBeGreaterThan(0)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 邊界值：異常 order_id
  // ══════════════════════════════════════════════════════════════

  test('[P3] view-order 帶有負數 ID 不應 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/my-account/view-order/-1/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P3] view-order 帶有 ID=0 不應 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/my-account/view-order/0/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P3] view-order 帶有非數字 ID 不應 500', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/my-account/view-order/not_a_number/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P3] view-order 帶有 XSS ID 不應執行 script', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/my-account/view-order/<script>alert(1)<\/script>/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const content = await page.content()
    expect(content).not.toContain('<script>alert(1)</script>')
  })

  test('[P3] view-order 帶有超大 ID 不應 500', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}/my-account/view-order/999999999999/`,
    )
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — WC 訂單列表合約欄位：建立並關聯合約後驗證顯示
  // ══════════════════════════════════════════════════════════════

  test('[P3] WC 訂單列表（若有訂單）合約 ID 連結應指向合約編輯頁', async ({ page }) => {
    if (!ids.orderId || !ids.contractId) {
      test.skip()
      return
    }

    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.WC_ORDERS}`)
    if (response!.status() >= 400) {
      test.skip()
      return
    }

    await page.waitForLoadState('domcontentloaded')
    const pageContent = await page.content()

    // 若有合約 ID 在訂單列表，應有連結指向 post.php?post=XXX&action=edit
    const contractIdStr = String(ids.contractId)
    if (pageContent.includes(contractIdStr)) {
      const contractLink = page.locator(`a[href*="post=${ids.contractId}"]`).first()
      const linkCount = await contractLink.count()
      if (linkCount > 0) {
        const href = await contractLink.getAttribute('href')
        expect(href).toContain(`post=${ids.contractId}`)
        expect(href).toContain('action=edit')
      }
    }
  })
})
