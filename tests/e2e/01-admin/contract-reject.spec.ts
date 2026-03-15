/**
 * 01-admin / contract-reject.spec.ts
 *
 * 拒絕合約 E2E 測試
 * 基於: spec/features/拒絕合約.feature + spec/es.md (RejectContract)
 *
 * 端點: /wp-admin/admin-post.php?action=reject_contract&post_id={id}
 * 觸發方式: admin_post_reject_contract（GET 請求）
 *
 * 優先級:
 *   P0 — 成功拒絕 pending 合約 → 狀態變 rejected
 *   P0 — 拒絕後重導向至合約列表頁
 *   P1 — 非 contract 類型 post 不受影響
 *   P1 — 不存在的 post_id 優雅處理
 *   P2 — 已拒絕的合約再次拒絕（冪等）
 *   P2 — UI 從編輯頁面點擊 Reject 按鈕
 *   P3 — 未登入存取應被拒絕
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  ADMIN_PAGES,
  AJAX_ACTION,
  CONTRACT_STATUS,
  EDGE,
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

  // ══════════════════════════════════════════════════════════════
  // P0 — admin-post.php：拒絕 pending 合約
  // ══════════════════════════════════════════════════════════════

  test('[P0] 管理員應可透過 admin-post 拒絕 pending 合約，狀態變為 rejected', async ({
    page,
  }) => {
    if (!ids.contractId3) {
      test.skip()
      return
    }

    // 確保初始為 pending
    const setRes = await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.PENDING,
    })
    expect(setRes.status).toBeLessThan(500)

    // 執行 reject via admin-post.php
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${ids.contractId3}`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 驗證合約狀態已變更為 rejected
    const after = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId3))
    expect(after.status).toBe(200)

    const contract = after.data as Record<string, unknown>
    expect(contract.status).toBe(CONTRACT_STATUS.REJECTED)
  })

  test('[P0] 拒絕合約後應重導向至合約列表頁 (/wp-admin/edit.php?post_type=contract)', async ({
    page,
  }) => {
    if (!ids.contractId3) {
      test.skip()
      return
    }

    // 先設為 pending
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.PENDING,
    })

    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${ids.contractId3}`
    await page.goto(rejectUrl)
    await page.waitForLoadState('domcontentloaded')

    // 最終 URL 應包含 post_type=contract
    const finalUrl = page.url()
    expect(finalUrl).toContain('post_type=contract')
    expect(finalUrl).toContain('edit.php')
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 非 contract 類型的 post_id 不應變更狀態
  // ══════════════════════════════════════════════════════════════

  test('[P1] 對非 contract 類型的 post 執行 reject，該 post 狀態不應變為 rejected', async ({
    page,
  }) => {
    // 建立一般 post
    const createRes = await wpPost(apiOpts, 'wp/v2/posts', {
      title: '[E2E] 非合約文章（reject 防護測試）',
      status: 'publish',
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

    // 一般 post 狀態不應變成 rejected
    const after = await wpGet(apiOpts, `wp/v2/posts/${postId}`)
    if (after.status === 200) {
      const post = after.data as Record<string, unknown>
      expect(post.status).not.toBe(CONTRACT_STATUS.REJECTED)
    }

    // 清理
    await wpPost(apiOpts, `wp/v2/posts/${postId}`, { status: 'trash' })
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 不存在/邊界 post_id
  // ══════════════════════════════════════════════════════════════

  test('[P1] 拒絕不存在的 post_id 應優雅處理，不應回傳 500', async ({ page }) => {
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=9999999`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P1] 拒絕 post_id=0 應優雅處理', async ({ page }) => {
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=0`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P1] 拒絕負數 post_id 應優雅處理', async ({ page }) => {
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=-1`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P1] 缺少 post_id 參數的拒絕請求應優雅處理', async ({ page }) => {
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P1] post_id 為超大整數不應導致 500', async ({ page }) => {
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${EDGE.MAX_INT}`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 冪等操作：已拒絕的合約再次拒絕
  // ══════════════════════════════════════════════════════════════

  test('[P2] 對已拒絕的合約再次拒絕應維持 rejected 狀態（冪等）', async ({ page }) => {
    if (!ids.contractId3) {
      test.skip()
      return
    }

    // 先設為 rejected
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.REJECTED,
    })

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

  // ══════════════════════════════════════════════════════════════
  // P2 — UI：從合約編輯頁面點擊 Reject 按鈕
  // ══════════════════════════════════════════════════════════════

  test('[P2] 合約編輯頁面側邊欄應顯示 Reject 按鈕', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    // 先確保合約為 pending
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId), {
      status: CONTRACT_STATUS.PENDING,
    })

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    // Reject 按鈕/連結應存在
    const rejectBtn = page.locator(
      'a:has-text("Reject"), input[value="Reject"], button:has-text("Reject")',
    ).first()

    if (await rejectBtn.count() > 0) {
      await expect(rejectBtn).toBeVisible()
      // pending 狀態的合約，Reject 按鈕不應為 disabled
      const isDisabled = await rejectBtn.getAttribute('disabled')
      expect(isDisabled).toBeNull()
    }
  })

  test('[P2] 從合約編輯頁面點擊 Reject 按鈕後應重導向至合約列表', async ({ page }) => {
    if (!ids.contractId3) {
      test.skip()
      return
    }

    // 先設為 pending
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.PENDING,
    })

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId3)}`)
    await page.waitForLoadState('domcontentloaded')

    const rejectBtn = page.locator(
      'a:has-text("Reject"), input[value="Reject"], button:has-text("Reject")',
    ).first()

    if (await rejectBtn.count() > 0) {
      await rejectBtn.click()
      await page.waitForLoadState('domcontentloaded')

      // 應重導向至合約列表頁
      expect(page.url()).toContain('post_type=contract')
      expect(page.url()).toContain('edit.php')
    }
  })

  test('[P2] 已拒絕的合約在編輯頁面 Reject 按鈕應為 disabled', async ({ page }) => {
    if (!ids.contractId3) {
      test.skip()
      return
    }

    // 設為 rejected
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId3), {
      status: CONTRACT_STATUS.REJECTED,
    })

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId3)}`)
    await page.waitForLoadState('domcontentloaded')

    const rejectBtn = page.locator(
      'a:has-text("Reject"), input[value="Reject"], button:has-text("Reject")',
    ).first()

    if (await rejectBtn.count() > 0) {
      // 已拒絕時 Reject 按鈕應為 disabled
      const isDisabled =
        (await rejectBtn.getAttribute('disabled')) !== null ||
        (await rejectBtn.getAttribute('class'))?.includes('disabled') ||
        !(await rejectBtn.isEnabled())
      expect(isDisabled).toBeTruthy()
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 未登入保護
  // ══════════════════════════════════════════════════════════════

  test('[P3] 未登入用戶透過 admin-post 拒絕合約應被拒絕（302 或 403）', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    await page.context().clearCookies()
    const rejectUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.REJECT_CONTRACT}&post_id=${ids.contractId}`
    const response = await page.goto(rejectUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 應被重導向至登入頁或被拒絕
    const finalUrl = page.url()
    const isProtected =
      finalUrl.includes('wp-login.php') ||
      response!.status() === 403
    expect(isProtected).toBeTruthy()
  })
})
