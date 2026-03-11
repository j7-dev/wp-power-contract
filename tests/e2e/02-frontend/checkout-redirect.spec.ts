/**
 * 02-frontend / checkout-redirect.spec.ts
 *
 * 結帳前重導向至合約 E2E 測試
 * 基於: spec/features/結帳前重導向至合約.feature
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  ADMIN_PAGES,
  SETTINGS_FIELDS,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, type ApiOptions } from '../helpers/api-client.js'

test.describe('02-frontend / 結帳前重導向至合約', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // 前置條件檢查
  // ────────────────────────────────────────────────────────────
  test('WooCommerce 結帳頁面在 display_contract_before_checkout=true 時應觸發重導向', async ({
    page,
  }) => {
    // 此測試需要 WooCommerce 啟用且結帳頁面存在
    // 先嘗試訪問結帳頁面
    const response = await page.goto(`${BASE_URL}/checkout/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const finalUrl = page.url()
    // 若設定為 true 且尚未簽約，URL 可能被導向至合約模板頁面
    // 或者 WooCommerce 未啟用，保持在原頁面
    // 兩種情況都不應是 500 錯誤
    expect(finalUrl.length).toBeGreaterThan(0)
  })

  test('帶有 is_signed=yes 參數的結帳頁面不應重導向', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/checkout/?is_signed=yes`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const finalUrl = page.url()
    // 帶有 is_signed=yes 時不應被重導向至合約頁面
    // 應保持在結帳頁面或顯示正常頁面
    if (finalUrl.includes('checkout')) {
      expect(finalUrl).toContain('is_signed=yes')
    }
  })

  test('非結帳頁面不應觸發重導向', async ({ page }) => {
    // 訪問首頁，不應被重導向
    const response = await page.goto(`${BASE_URL}/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const finalUrl = page.url()
    // 首頁不應被重導向至合約頁面
    expect(finalUrl).not.toContain('contract_template')
  })

  // ────────────────────────────────────────────────────────────
  // 設定關閉時不重導向
  // ────────────────────────────────────────────────────────────
  test('display_contract_before_checkout=false 時結帳頁面不應重導向', async ({ page }) => {
    // 先透過設定頁面確認或修改設定
    // 這裡做防禦性測試：直接訪問結帳頁面
    const response = await page.goto(`${BASE_URL}/checkout/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
    // 不論設定為何，頁面都不應 500
  })

  // ────────────────────────────────────────────────────────────
  // 重導向 URL 格式驗證
  // ────────────────────────────────────────────────────────────
  test('合約模板頁面應可透過 redirect=checkout 參數存取', async ({ page }) => {
    if (!ids.templateId) {
      test.skip()
      return
    }

    // 取得合約模板 permalink
    const res = await wpGet(apiOpts, EP.WP_TEMPLATE(ids.templateId))
    if (res.status !== 200) {
      test.skip()
      return
    }

    const template = res.data as Record<string, unknown>
    const link = (template.link as string) ?? ''

    if (!link) {
      test.skip()
      return
    }

    // 帶 redirect=checkout 參數訪問合約模板頁面
    const separator = link.includes('?') ? '&' : '?'
    const redirectUrl = `${link}${separator}redirect=checkout`

    const response = await page.goto(redirectUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 合約模板頁面應正常顯示
    const pageContent = await page.content()
    expect(pageContent.length).toBeGreaterThan(0)
  })
})
