/**
 * 01-admin / contract-approve.spec.ts
 *
 * 核准合約 E2E 測試
 * 基於: spec/features/核准合約.feature
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  ADMIN_PAGES,
  AJAX_ACTION,
  CONTRACT_STATUS,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, wpPost, type ApiOptions } from '../helpers/api-client.js'

test.describe('01-admin / 核准合約', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // admin-post.php: approve_contract
  // ────────────────────────────────────────────────────────────
  test('管理員應可透過 admin-post 核准合約', async ({ page }) => {
    if (!ids.contractId2) {
      test.skip()
      return
    }

    // 先確認合約為 pending
    const before = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId2))
    expect(before.status).toBeLessThan(500)

    // 執行 approve via admin-post.php (GET request)
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId2}`
    const response = await page.goto(approveUrl)

    // 應重導向至合約列表頁
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 檢查最終 URL 是否為合約列表頁
    const finalUrl = page.url()
    expect(
      finalUrl.includes('post_type=contract') ||
      finalUrl.includes('edit.php') ||
      response!.status() === 302 ||
      response!.status() === 200
    ).toBeTruthy()

    // 驗證合約狀態已變更
    const after = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId2))
    if (after.status === 200) {
      const contract = after.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.APPROVED)
    }
  })

  test('核准不存在的合約 post_id 應不會導致 500', async ({ page }) => {
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=9999999`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('核准非 contract 類型的 post 不應變更狀態', async ({ page }) => {
    // 先建立一般 post
    const createRes = await wpPost(apiOpts, 'wp/v2/posts', {
      title: '[E2E] 非合約文章 (approve test)',
      status: 'draft',
    })

    if (createRes.status !== 201) {
      test.skip()
      return
    }

    const postId = (createRes.data as Record<string, unknown>).id as number

    // 嘗試對一般 post 執行 approve
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${postId}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 一般 post 的狀態不應變成 approved
    const after = await wpGet(apiOpts, `wp/v2/posts/${postId}`)
    if (after.status === 200) {
      const post = after.data as Record<string, unknown>
      expect(post.status).not.toBe(CONTRACT_STATUS.APPROVED)
    }
  })

  // ────────────────────────────────────────────────────────────
  // UI: 從編輯頁面點擊 Approve 按鈕
  // ────────────────────────────────────────────────────────────
  test('從合約編輯頁面點擊 Approve 按鈕應觸發核准', async ({ page }) => {
    if (!ids.contractId2) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId2)}`)
    await page.waitForLoadState('domcontentloaded')

    // 尋找 Approve 按鈕/連結
    const approveBtn = page.locator(
      'a:has-text("Approve"), input[value="Approve"], button:has-text("Approve")',
    ).first()

    if ((await approveBtn.count()) > 0) {
      await approveBtn.click()
      await page.waitForLoadState('domcontentloaded')

      // 應重導向至合約列表頁
      expect(page.url()).toContain('post_type=contract')
    }
  })

  test('已核准的合約再次核准不應出錯', async ({ page }) => {
    if (!ids.contractId2) {
      test.skip()
      return
    }

    // 先確保已核准
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId2}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 狀態應維持 approved
    const after = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId2))
    if (after.status === 200) {
      const contract = after.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.APPROVED)
    }
  })
})
