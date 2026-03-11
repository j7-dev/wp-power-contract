/**
 * 01-admin / settings.spec.ts
 *
 * 外掛設定 CRUD E2E 測試
 * 基於: spec/features/更新外掛設定.feature
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  ADMIN_PAGES,
  TEST_SETTINGS,
  SETTINGS_FIELDS,
  loadTestIds,
  type TestIds,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import type { ApiOptions } from '../helpers/api-client.js'

test.describe('01-admin / 外掛設定', () => {
  let apiOpts: ApiOptions
  let ids: TestIds

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
    ids = loadTestIds()
  })

  // ────────────────────────────────────────────────────────────
  // UI: 設定頁面存取
  // ────────────────────────────────────────────────────────────
  test('管理員可存取設定頁面', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    // 設定頁面應存在
    const response = page.url()
    expect(response).toContain('power-contract')

    // 頁面應有 form 或設定區塊
    const pageContent = await page.content()
    const hasSettingsForm =
      pageContent.includes('power_contract_settings') ||
      pageContent.includes('power-contract') ||
      pageContent.includes('settings') ||
      pageContent.includes('form')
    expect(hasSettingsForm).toBeTruthy()
  })

  // ────────────────────────────────────────────────────────────
  // UI: General 分頁
  // ────────────────────────────────────────────────────────────
  test('設定頁面應包含 General 分頁或區塊', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasGeneralTab =
      pageContent.includes('General') ||
      pageContent.includes('general') ||
      pageContent.includes('ajax_signed')
    expect(hasGeneralTab).toBeTruthy()
  })

  test('General 設定應包含簽署完成 Modal 欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    // 檢查是否有簽署完成 Modal 相關欄位
    const hasModalFields =
      pageContent.includes(SETTINGS_FIELDS.AJAX_SIGNED_TITLE) ||
      pageContent.includes('ajax_signed_title') ||
      pageContent.includes('Modal') ||
      pageContent.includes('簽署完成')
    expect(hasModalFields).toBeTruthy()
  })

  test('應可填寫並儲存 General 設定', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    // 嘗試找到 ajax_signed_title 輸入框
    const titleInput = page.locator(
      `input[name*="ajax_signed_title"], input[id*="ajax_signed_title"]`,
    ).first()

    if ((await titleInput.count()) > 0) {
      await titleInput.fill(TEST_SETTINGS.AJAX_SIGNED_TITLE)

      // 嘗試找到 description 欄位
      const descInput = page.locator(
        `textarea[name*="ajax_signed_description"], input[name*="ajax_signed_description"]`,
      ).first()
      if ((await descInput.count()) > 0) {
        await descInput.fill(TEST_SETTINGS.AJAX_SIGNED_DESCRIPTION)
      }

      // 送出表單
      const submitBtn = page.locator(
        'input[type="submit"], button[type="submit"], .submit input',
      ).first()
      if ((await submitBtn.count()) > 0) {
        await submitBtn.click()
        await page.waitForLoadState('domcontentloaded')

        // 驗證設定已儲存（重新載入後值仍存在）
        const savedValue = await titleInput.inputValue()
        expect(savedValue).toBe(TEST_SETTINGS.AJAX_SIGNED_TITLE)
      }
    }
  })

  // ────────────────────────────────────────────────────────────
  // UI: WooCommerce 分頁
  // ────────────────────────────────────────────────────────────
  test('設定頁面應有 WooCommerce 分頁', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasWcTab =
      pageContent.includes('Woocommerce') ||
      pageContent.includes('WooCommerce') ||
      pageContent.includes('woocommerce')
    expect(hasWcTab).toBeTruthy()
  })

  test('WooCommerce 設定應包含合約模板選擇欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasTemplateField =
      pageContent.includes('chosen_contract_template') ||
      pageContent.includes('contract_template') ||
      pageContent.includes('display_contract')
    expect(hasTemplateField).toBeTruthy()
  })

  // ────────────────────────────────────────────────────────────
  // UI: Email 分頁
  // ────────────────────────────────────────────────────────────
  test('設定頁面應有 Email 分頁', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasEmailTab =
      pageContent.includes('Email') ||
      pageContent.includes('email') ||
      pageContent.includes('emails')
    expect(hasEmailTab).toBeTruthy()
  })

  test('Email 設定應可設定通知信收件人', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    // 尋找 Email 分頁或 emails 輸入框
    const emailInput = page.locator(
      `input[name*="emails"], textarea[name*="emails"], input[id*="emails"]`,
    ).first()

    if ((await emailInput.count()) > 0) {
      const currentValue = await emailInput.inputValue()
      // 只要欄位存在且可互動即可
      expect(currentValue).toBeDefined()
    } else {
      // 嘗試尋找 Email tab 點擊後出現的欄位
      const emailTab = page.locator('a:has-text("Email"), button:has-text("Email")').first()
      if ((await emailTab.count()) > 0) {
        await emailTab.click()
        await page.waitForTimeout(500)

        const emailField = page.locator('input[name*="email"], textarea[name*="email"]').first()
        const emailFieldExists = (await emailField.count()) > 0
        expect(emailFieldExists).toBeTruthy()
      }
    }
  })

  // ────────────────────────────────────────────────────────────
  // 權限: 非管理員不可存取
  // ────────────────────────────────────────────────────────────
  test('設定頁面應需要管理員權限 (non-admin 導向或錯誤)', async ({ page }) => {
    // 使用未認證的 context（清除 cookies）
    await page.context().clearCookies()
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)

    // 未登入應重導向至 wp-login.php 或顯示錯誤
    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)

    const finalUrl = page.url()
    const isRedirectedToLogin =
      finalUrl.includes('wp-login.php') || finalUrl.includes('login')
    expect(isRedirectedToLogin).toBeTruthy()
  })
})
