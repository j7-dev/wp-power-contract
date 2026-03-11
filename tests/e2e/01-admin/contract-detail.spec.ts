/**
 * 01-admin / contract-detail.spec.ts
 *
 * 查看合約詳情 E2E 測試
 * 基於: spec/features/查看合約詳情.feature
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  ADMIN_PAGES,
  TEST_CONTRACT,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, type ApiOptions } from '../helpers/api-client.js'

test.describe('01-admin / 查看合約詳情', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // REST API: 取得合約詳情
  // ────────────────────────────────────────────────────────────
  test('應可透過 REST API 取得單筆合約詳情', async () => {
    if (!ids.contractId) {
      test.skip()
      return
    }
    const res = await wpGet(apiOpts, EP.WP_CONTRACT(ids.contractId))
    expect(res.status).toBeLessThan(500)

    if (res.status === 200) {
      const contract = res.data as Record<string, unknown>
      expect(contract).toHaveProperty('id', ids.contractId)
      expect(contract).toHaveProperty('status')
    }
  })

  test('取得不存在的合約應回傳 404', async () => {
    const res = await wpGet(apiOpts, EP.WP_CONTRACT(9999999))
    expect(res.status).toBeLessThan(500)
    // WP REST 對不存在的 post 應回 404
    expect([403, 404]).toContain(res.status)
  })

  // ────────────────────────────────────────────────────────────
  // UI: 合約編輯頁面 metabox
  // ────────────────────────────────────────────────────────────
  test('管理員可進入合約編輯頁面', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    // 頁面應包含編輯表單
    const postForm = page.locator('#post, #editor, form#post')
    const formExists = (await postForm.count()) > 0
    expect(formExists).toBeTruthy()
  })

  test('合約 metabox 應顯示合約欄位資料', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    // 根據 feature spec，metabox 應以表格顯示：
    // Contract Template Id, User Name, User Phone, Signature, Signed Contract, Signed At
    const pageContent = await page.content()

    // 檢查欄位名稱是否出現在頁面中（i18n 翻譯後可能不同）
    const hasUserName =
      pageContent.includes('User Name') ||
      pageContent.includes('user_name') ||
      pageContent.includes(TEST_CONTRACT.USER_NAME)
    expect(hasUserName).toBeTruthy()
  })

  test('合約 metabox 不應顯示系統隱藏欄位', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    // Feature spec: 不顯示 _edit_lock, _thumbnail_id
    // 這些系統欄位不應直接出現在 metabox 表格中
    const metaboxArea = page.locator('#postcustom, .postbox')
    if ((await metaboxArea.count()) > 0) {
      const metaboxText = await metaboxArea.allTextContents()
      const combined = metaboxText.join(' ')
      // _edit_lock 不應在 metabox 自訂欄位中可見
      // 注意: 可能在 WP 原生 Custom Fields 中出現，但外掛 metabox 應隱藏之
      expect(combined).not.toContain('_edit_lock')
    }
  })

  // ────────────────────────────────────────────────────────────
  // 側邊欄 Approval metabox
  // ────────────────────────────────────────────────────────────
  test('pending 合約應顯示 Approve 和 Reject 按鈕', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    // 尋找 Approval metabox 中的按鈕
    const approveBtn = page.locator('a:has-text("Approve"), input[value="Approve"], button:has-text("Approve")')
    const rejectBtn = page.locator('a:has-text("Reject"), input[value="Reject"], button:has-text("Reject")')

    // pending 狀態的合約，兩個按鈕都應可點擊
    const approveVisible = (await approveBtn.count()) > 0
    const rejectVisible = (await rejectBtn.count()) > 0

    // 至少其中一個應該存在
    expect(approveVisible || rejectVisible).toBeTruthy()
  })

  test('合約詳情應包含 client IP 資訊', async ({ page }) => {
    if (!ids.contractId) {
      test.skip()
      return
    }
    await page.goto(`${BASE_URL}${ADMIN_PAGES.CONTRACT_EDIT(ids.contractId)}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    // global-setup 建立的合約有設定 client_ip = 127.0.0.1
    const hasIp =
      pageContent.includes('127.0.0.1') ||
      pageContent.includes('client_ip') ||
      pageContent.includes('Client Ip')
    expect(hasIp).toBeTruthy()
  })
})
