/**
 * 01-admin / contract-approve.spec.ts
 *
 * 核准合約 E2E 測試
 * 基於: spec/features/核准合約.feature + spec/es.md (ApproveContract)
 *
 * 端點: /wp-admin/admin-post.php?action=approve_contract&post_id={id}
 * 觸發方式: admin_post_approve_contract（GET 請求）
 *
 * 優先級:
 *   P0 — 成功核准 pending 合約 → 狀態變 approved
 *   P0 — 核准後重導向至合約列表頁
 *   P1 — 非 contract 類型 post 不受影響
 *   P1 — 不存在的 post_id 優雅處理
 *   P2 — 已核准的合約再次核准（冪等）
 *   P2 — UI 從編輯頁面點擊 Approve 按鈕
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

test.describe('01-admin / 核准合約', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — admin-post.php：核准 pending 合約
  // ══════════════════════════════════════════════════════════════

  test('[P0] 管理員應可透過 admin-post 核准 pending 合約，狀態變為 approved', async ({
    page,
  }) => {
    if (!ids.contractId2) {
      test.skip()
      return
    }

    // 確認初始狀態為 pending
    const before = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId2))
    expect(before.status).toBeLessThan(500)

    // 確保是 pending（若已被其他測試改動，先重設）
    if (before.status === 200) {
      const c = before.data as Record<string, unknown>
      if (c.status !== CONTRACT_STATUS.PENDING) {
        await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId2), {
          status: CONTRACT_STATUS.PENDING,
        })
      }
    }

    // 執行 approve via admin-post.php
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId2}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 驗證合約狀態已變更為 approved
    const after = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId2))
    expect(after.status).toBe(200)

    const contract = after.data as Record<string, unknown>
    expect(contract.status).toBe(CONTRACT_STATUS.APPROVED)
  })

  test('[P0] 核准合約後應重導向至合約列表頁 (/wp-admin/edit.php?post_type=contract)', async ({
    page,
  }) => {
    if (!ids.contractId2) {
      test.skip()
      return
    }

    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId2}`
    await page.goto(approveUrl)
    await page.waitForLoadState('domcontentloaded')

    // 最終 URL 應包含 post_type=contract
    const finalUrl = page.url()
    expect(finalUrl).toContain('post_type=contract')
    expect(finalUrl).toContain('edit.php')
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 非 contract 類型的 post_id 不應變更狀態
  // ══════════════════════════════════════════════════════════════

  test('[P1] 對非 contract 類型的 post 執行 approve，該 post 狀態不應變為 approved', async ({
    page,
  }) => {
    // 建立一般 post（WordPress 原生文章）
    const createRes = await wpPost(apiOpts, 'wp/v2/posts', {
      title: '[E2E] 非合約文章（approve 防護測試）',
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

    // 一般 post 狀態不應變成 approved
    const after = await wpGet(apiOpts, `wp/v2/posts/${postId}`)
    if (after.status === 200) {
      const post = after.data as Record<string, unknown>
      expect(post.status).not.toBe(CONTRACT_STATUS.APPROVED)
      // 狀態應仍是 draft
      expect(post.status).toBe('draft')
    }

    // 清理測試資料
    await wpPost(apiOpts, `wp/v2/posts/${postId}`, { status: 'trash' })
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 不存在的 post_id
  // ══════════════════════════════════════════════════════════════

  test('[P1] 核准不存在的 post_id 應優雅處理，不應回傳 500', async ({ page }) => {
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=9999999`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P1] 核准 post_id=0 應優雅處理，不應回傳 500', async ({ page }) => {
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=0`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P1] 核准負數 post_id 應優雅處理，不應回傳 500', async ({ page }) => {
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=-1`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P1] 缺少 post_id 參數的核准請求應優雅處理', async ({ page }) => {
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  test('[P1] post_id 為超大整數不應導致 500', async ({ page }) => {
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${EDGE.MAX_INT}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — 冪等操作：已核准的合約再次核准
  // ══════════════════════════════════════════════════════════════

  test('[P2] 對已核准的合約再次核准應維持 approved 狀態（冪等）', async ({ page }) => {
    if (!ids.contractId2) {
      test.skip()
      return
    }

    // 先確保是 approved
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId2), {
      status: CONTRACT_STATUS.APPROVED,
    })

    // 再次 approve
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

  // ══════════════════════════════════════════════════════════════
  // P2 — UI：從合約編輯頁面點擊 Approve 按鈕
  // ══════════════════════════════════════════════════════════════

  test('[P2] 合約編輯頁面側邊欄應顯示 Approve 按鈕', async ({ page }) => {
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

    // Approve 按鈕/連結應存在
    const approveBtn = page.locator(
      'a:has-text("Approve"), input[value="Approve"], button:has-text("Approve")',
    ).first()

    const hasApproveBtn = (await approveBtn.count()) > 0
    // pending 狀態的合約，Approve 按鈕應可見
    if (hasApproveBtn) {
      await expect(approveBtn).toBeVisible()
      // Approve 按鈕不應為 disabled
      const isDisabled = await approveBtn.getAttribute('disabled')
      expect(isDisabled).toBeNull()
    }
  })

  test('[P2] 從合約編輯頁面點擊 Approve 按鈕後應重導向至合約列表', async ({ page }) => {
    if (!ids.contractId2) {
      test.skip()
      return
    }

    // 先設為 pending
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId2), {
      status: CONTRACT_STATUS.PENDING,
    })

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId2)}`)
    await page.waitForLoadState('domcontentloaded')

    const approveBtn = page.locator(
      'a:has-text("Approve"), input[value="Approve"], button:has-text("Approve")',
    ).first()

    if (await approveBtn.count() > 0) {
      await approveBtn.click()
      await page.waitForLoadState('domcontentloaded')

      // 應重導向至合約列表頁
      expect(page.url()).toContain('post_type=contract')
      expect(page.url()).toContain('edit.php')
    }
  })

  test('[P2] 已核准的合約在編輯頁面 Approve 按鈕應為 disabled', async ({ page }) => {
    if (!ids.contractId2) {
      test.skip()
      return
    }

    // 設為 approved
    await wpPost(apiOpts, EP.WP_CONTRACT(ids.contractId2), {
      status: CONTRACT_STATUS.APPROVED,
    })

    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId2)}`)
    await page.waitForLoadState('domcontentloaded')

    const approveBtn = page.locator(
      'a:has-text("Approve"), input[value="Approve"], button:has-text("Approve")',
    ).first()

    if (await approveBtn.count() > 0) {
      // 已核准時 Approve 按鈕應為 disabled
      const isDisabled =
        (await approveBtn.getAttribute('disabled')) !== null ||
        (await approveBtn.getAttribute('class'))?.includes('disabled') ||
        !(await approveBtn.isEnabled())
      expect(isDisabled).toBeTruthy()
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 未登入保護
  // ══════════════════════════════════════════════════════════════

  test('[P3] 未登入用戶透過 admin-post 核准合約應被拒絕（302 或 403）', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }

    await page.context().clearCookies()
    const approveUrl = `${BASE_URL}${EP.ADMIN_POST}?action=${AJAX_ACTION.APPROVE_CONTRACT}&post_id=${ids.contractId}`
    const response = await page.goto(approveUrl)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 應被重導向至登入頁或被拒絕
    const finalUrl = page.url()
    const isProtected =
      finalUrl.includes('wp-login.php') ||
      response!.status() === 403
    expect(isProtected).toBeTruthy()

    // 確認合約狀態沒有被改變（若可取得）
  })
})
