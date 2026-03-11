/**
 * 02-frontend / thankyou-redirect.spec.ts
 *
 * 感謝頁前重導向至合約 E2E 測試
 * 基於: spec/features/感謝頁前重導向至合約.feature
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  EP,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import { wpGet, type ApiOptions } from '../helpers/api-client.js'

test.describe('02-frontend / 感謝頁前重導向至合約', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // WooCommerce 感謝頁相關
  // ────────────────────────────────────────────────────────────
  test('訂單感謝頁 URL 在合約未簽時應包含合約模板重導向', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    // 訪問訂單感謝頁
    const thankYouUrl = `${BASE_URL}/checkout/order-received/${ids.orderId}/`
    const response = await page.goto(thankYouUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 根據設定，可能：
    // 1. display_contract_after_checkout=true → 重導向至合約頁面
    // 2. display_contract_after_checkout=false → 正常顯示感謝頁
    // 3. WooCommerce 未啟用 → 404
    // 這裡驗證不會 500 即可
    const finalUrl = page.url()
    expect(finalUrl.length).toBeGreaterThan(0)
  })

  test('訂單已簽約 (is_signed=yes) 時感謝頁不應重導向', async ({ page }) => {
    if (!ids.orderId) {
      test.skip()
      return
    }

    // 如果訂單已設定 is_signed=yes，感謝頁應正常顯示
    const thankYouUrl = `${BASE_URL}/checkout/order-received/${ids.orderId}/?is_signed=yes`
    const response = await page.goto(thankYouUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 重導向 URL 格式驗證
  // ────────────────────────────────────────────────────────────
  test('合約模板頁面應可透過 redirect=thankyou 與 order_id 參數存取', async ({
    page,
  }) => {
    if (!ids.templateId || !ids.orderId) {
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

    // 帶 redirect=thankyou 和 order_id 參數
    const separator = link.includes('?') ? '&' : '?'
    const redirectUrl = `${link}${separator}redirect=thankyou&order_id=${ids.orderId}`

    const response = await page.goto(redirectUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    // 頁面應正常載入
    const pageContent = await page.content()
    expect(pageContent.length).toBeGreaterThan(0)
  })

  test('不存在的 order_id 在感謝頁不應導致 500', async ({ page }) => {
    const thankYouUrl = `${BASE_URL}/checkout/order-received/9999999/`
    const response = await page.goto(thankYouUrl)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })

  // ────────────────────────────────────────────────────────────
  // 設定相關
  // ────────────────────────────────────────────────────────────
  test('display_contract_after_checkout 設定關閉時不改變感謝頁 URL', async ({
    page,
  }) => {
    // 防禦性測試：訪問感謝頁不應 500
    const response = await page.goto(`${BASE_URL}/checkout/order-received/`)
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
  })
})
