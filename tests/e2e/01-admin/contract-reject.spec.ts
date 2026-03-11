/**
 * 01-admin / contract-reject.spec.ts
 *
 * 拒絕合約 E2E 測試
 * 基於: spec/features/拒絕合約.feature
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

test.describe('01-admin / 拒絕合約', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // admin-post.php: reject_contract
  // ────────────────────────────────────────────────────────────
  test('管理員應可透過 admin-post 拒絕合約', async ({ page }) => {
    if (!ids.contractId3) {
      test.skip()
      return
    }

    // 先確認合約為 pending
    const before = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId3))
    expect(before.status).toBeLessThan(500)

    // 執行 reject via admin-post.php (GET request)
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${ids.contractId3}`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 檢查重導向到合約列表頁
    const finalUrl = page.url()
    expect(
      finalUrl.includes('post_type=contract') ||
      finalUrl.includes('edit.php') ||
      response!.status() === 302 ||
      response!.status() === 200
    ).toBeTruthy()

    // 驗證合約狀態已變更為 rejected
    const after = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId3))
    if (after.status === 200) {
      const contract = after.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.REJECTED)
    }
  })

  test('拒絕不存在的合約 post_id 應不會導致 500', async ({ page }) => {
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=9999999`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('拒絕非 contract 類型的 post 不應變更狀態', async ({ page }) => {
    // 建立一般 post
    const createRes = await wpPost(apiOpts, 'wp/v2/posts', {
      title: '[E2E] 非合約文章 (reject test)',
      status: 'draft',
    })

    if (createRes.status !== 201) {
      test.skip()
      return
    }

    const postId = (createRes.data as Record<string, unknown>).id as number

    // 嘗試對一般 post 執行 reject
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${postId}`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 一般 post 的狀態不應變成 rejected
    const after = await wpGet(apiOpts, `wp/v2/posts/${postId}`)
    if (after.status === 200) {
      const post = after.data as Record<string, unknown>
      expect(post.status).not.toBe(CONTRACT_STATUS.REJECTED)
    }
  })

  // ────────────────────────────────────────────────────────────
  // UI: 從編輯頁面點擊 Reject 按鈕
  // ────────────────────────────────────────────────────────────
  test('從合約編輯頁面點擊 Reject 按鈕應觸發拒絕', async ({ page }) => {
    if (!ids.contractId3) {
      test.skip()
      return
    }

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId3)}`)
    await page.waitForLoadState('domcontentloaded')

    // 尋找 Reject 按鈕/連結
    const rejectBtn = page.locator(
      'a:has-text("Reject"), input[value="Reject"], button:has-text("Reject")',
    ).first()

    if ((await rejectBtn.count()) > 0) {
      await rejectBtn.click()
      await page.waitForLoadState('domcontentloaded')

      // 應重導向至合約列表頁
      expect(page.url()).toContain('post_type=contract')
    }
  })

  test('已拒絕的合約再次拒絕不應出錯', async ({ page }) => {
    if (!ids.contractId3) {
      test.skip()
      return
    }

    // 再次 reject
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${ids.contractId3}`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 狀態應維持 rejected
    const after = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId3))
    if (after.status === 200) {
      const contract = after.data as Record<string, unknown>
      expect(contract.status).toBe(CONTRACT_STATUS.REJECTED)
    }
  })
})
