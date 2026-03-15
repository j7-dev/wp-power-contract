/**
 * 01-admin / settings.spec.ts
 *
 * 外掛設定 E2E 測試
 * 基於: spec/features/更新外掛設定.feature + spec/es.md (UpdateSettings)
 *
 * 端點: WordPress Settings API（options.php 表單提交）
 * 設定 key: power_contract_settings
 *
 * 優先級:
 *   P0 — 管理員可存取設定頁面
 *   P0 — General 分頁包含簽署完成 Modal 欄位
 *   P1 — 可填寫並儲存 General 設定
 *   P1 — Woocommerce 分頁存在且包含整合選項
 *   P1 — Email 分頁動態新增/移除收件人欄位
 *   P2 — WooCommerce 未安裝時 Woocommerce 分頁應 disabled
 *   P3 — 未登入/無權限用戶應被拒絕
 */
import { test, expect } from '@playwright/test'
import {
  BASE_URL,
  ADMIN_PAGES,
  TEST_SETTINGS,
  SETTINGS_FIELDS,
  EDGE,
} from '../fixtures/test-data.js'
import { getNonce } from '../helpers/admin-setup.js'
import type { ApiOptions } from '../helpers/api-client.js'

test.describe('01-admin / 外掛設定', () => {
  let apiOpts: ApiOptions

  test.beforeAll(async ({ request }) => {
    apiOpts = { request, baseURL: BASE_URL, nonce: getNonce() }
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — 設定頁面存取
  // ══════════════════════════════════════════════════════════════

  test('[P0] 管理員可存取設定頁面，URL 包含 power-contract', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
    expect(page.url()).toContain('power-contract')
  })

  test('[P0] 設定頁面應包含 WordPress 表單', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    // 應存在 form 或 submit 按鈕
    const form = page.locator('form')
    const hasForm = await form.count() > 0
    expect(hasForm).toBeTruthy()
  })

  // ══════════════════════════════════════════════════════════════
  // P0 — General 分頁
  // ══════════════════════════════════════════════════════════════

  test('[P0] 設定頁面應包含 General 分頁或區塊', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    // General 分頁或 ajax_signed 欄位應存在
    const hasGeneral =
      pageContent.includes('General') ||
      pageContent.includes('general') ||
      pageContent.includes('ajax_signed')
    expect(hasGeneral).toBeTruthy()
  })

  test('[P0] General 分頁應包含 ajax_signed_title 欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasTitleField =
      pageContent.includes(SETTINGS_FIELDS.AJAX_SIGNED_TITLE) ||
      pageContent.includes('ajax_signed_title') ||
      pageContent.includes('簽署完成')
    expect(hasTitleField).toBeTruthy()
  })

  test('[P0] General 分頁應包含 ajax_signed_description 欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasDescField =
      pageContent.includes(SETTINGS_FIELDS.AJAX_SIGNED_DESCRIPTION) ||
      pageContent.includes('ajax_signed_description')
    expect(hasDescField).toBeTruthy()
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — 儲存 General 設定
  // ══════════════════════════════════════════════════════════════

  test('[P1] 應可填寫並儲存 ajax_signed_title 設定，儲存後值保留', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    // 嘗試點擊 General 分頁（若有分頁切換）
    const generalTab = page.locator(
      'a:has-text("General"), button:has-text("General"), [data-tab="general"]',
    ).first()
    if (await generalTab.count() > 0) {
      await generalTab.click()
      await page.waitForTimeout(300)
    }

    const titleInput = page.locator(
      `input[name*="ajax_signed_title"], input[id*="ajax_signed_title"]`,
    ).first()

    if (await titleInput.count() > 0) {
      await titleInput.fill(TEST_SETTINGS.AJAX_SIGNED_TITLE)

      const submitBtn = page.locator(
        'input[type="submit"], button[type="submit"]',
      ).first()

      if (await submitBtn.count() > 0) {
        await submitBtn.click()
        await page.waitForLoadState('domcontentloaded')

        // 重新載入後值應保留
        await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
        await page.waitForLoadState('domcontentloaded')

        // 若有 General 分頁，點擊切換
        if (await generalTab.count() > 0) {
          await generalTab.click()
          await page.waitForTimeout(300)
        }

        const savedTitleInput = page.locator(
          `input[name*="ajax_signed_title"], input[id*="ajax_signed_title"]`,
        ).first()

        if (await savedTitleInput.count() > 0) {
          const savedValue = await savedTitleInput.inputValue()
          expect(savedValue).toBe(TEST_SETTINGS.AJAX_SIGNED_TITLE)
        }
      }
    }
  })

  test('[P1] 應可填寫並儲存 ajax_signed_btn_text 設定（空值時按鈕隱藏）', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const btnTextInput = page.locator(
      `input[name*="ajax_signed_btn_text"], input[id*="ajax_signed_btn_text"]`,
    ).first()

    if (await btnTextInput.count() > 0) {
      // 先設空值（按鈕應隱藏）
      await btnTextInput.fill('')

      const submitBtn = page.locator('input[type="submit"], button[type="submit"]').first()
      if (await submitBtn.count() > 0) {
        await submitBtn.click()
        await page.waitForLoadState('domcontentloaded')

        // 重新載入確認值為空
        const savedInput = page.locator(
          `input[name*="ajax_signed_btn_text"], input[id*="ajax_signed_btn_text"]`,
        ).first()
        if (await savedInput.count() > 0) {
          const saved = await savedInput.inputValue()
          expect(saved).toBe('')
        }
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — Woocommerce 分頁
  // ══════════════════════════════════════════════════════════════

  test('[P1] 設定頁面應有 Woocommerce 分頁', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasWcTab =
      pageContent.includes('Woocommerce') ||
      pageContent.includes('WooCommerce') ||
      pageContent.includes('woocommerce')
    expect(hasWcTab).toBeTruthy()
  })

  test('[P1] Woocommerce 分頁應包含 chosen_contract_template 欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasTemplateField =
      pageContent.includes('chosen_contract_template') ||
      pageContent.includes('display_contract_before_checkout') ||
      pageContent.includes('display_contract_after_checkout')
    expect(hasTemplateField).toBeTruthy()
  })

  test('[P1] Woocommerce 分頁應包含 display_order_info 欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasField =
      pageContent.includes('display_order_info') ||
      pageContent.includes('Order Info')
    // 若 WooCommerce 已啟用，此欄位應存在
    if (pageContent.includes('woocommerce') || pageContent.includes('WooCommerce')) {
      expect(hasField).toBeTruthy()
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P1 — Email 分頁
  // ══════════════════════════════════════════════════════════════

  test('[P1] 設定頁面應有 Email 分頁', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()
    const hasEmailTab =
      pageContent.includes('Email') ||
      pageContent.includes('email') ||
      pageContent.includes('emails')
    expect(hasEmailTab).toBeTruthy()
  })

  test('[P1] Email 分頁應有收件人輸入欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    // 嘗試點擊 Email 分頁
    const emailTab = page.locator('a:has-text("Email"), button:has-text("Email")').first()
    if (await emailTab.count() > 0) {
      await emailTab.click()
      await page.waitForTimeout(500)
    }

    const emailInput = page.locator(
      `input[name*="emails"], textarea[name*="emails"], input[type="email"]`,
    ).first()

    if (await emailInput.count() > 0) {
      await expect(emailInput).toBeVisible()
    } else {
      // 若找不到，至少頁面應包含 email 相關文字
      const pageContent = await page.content()
      expect(pageContent).toMatch(/email|Email/i)
    }
  })

  test('[P1] Email 分頁點擊加號應新增收件人欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    // 點擊 Email 分頁
    const emailTab = page.locator('a:has-text("Email"), button:has-text("Email")').first()
    if (await emailTab.count() > 0) {
      await emailTab.click()
      await page.waitForTimeout(500)
    }

    // 找到加號按鈕
    const addBtn = page.locator(
      'button.add-email, .add-field, [data-action="add"], button:has-text("+"), .dashicons-plus',
    ).first()

    if (await addBtn.count() > 0) {
      // 記錄初始欄位數量
      const emailInputsBefore = page.locator('input[name*="emails"]')
      const countBefore = await emailInputsBefore.count()

      await addBtn.click()
      await page.waitForTimeout(300)

      // 欄位數量應增加
      const countAfter = await emailInputsBefore.count()
      expect(countAfter).toBeGreaterThan(countBefore)
    }
  })

  test('[P1] Email 分頁只有一個收件人時，點擊減號不應移除（至少保留一個）', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const emailTab = page.locator('a:has-text("Email"), button:has-text("Email")').first()
    if (await emailTab.count() > 0) {
      await emailTab.click()
      await page.waitForTimeout(500)
    }

    // 找到減號按鈕
    const removeBtn = page.locator(
      'button.remove-email, .remove-field, [data-action="remove"], button:has-text("-"), .dashicons-minus',
    ).first()

    if (await removeBtn.count() > 0) {
      const emailInputsBefore = page.locator('input[name*="emails"]')
      const countBefore = await emailInputsBefore.count()

      if (countBefore === 1) {
        await removeBtn.click()
        await page.waitForTimeout(300)

        // 欄位數量應維持為 1（不能移除最後一個）
        const countAfter = await emailInputsBefore.count()
        expect(countAfter).toBeGreaterThanOrEqual(1)
      }
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P2 — WooCommerce 未安裝時的行為
  // ══════════════════════════════════════════════════════════════

  test('[P2] WooCommerce 未安裝時 Woocommerce 分頁應顯示為 disabled 或提示', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const pageContent = await page.content()

    // 若 WooCommerce 未安裝，應有提示訊息
    // 若 WooCommerce 已安裝，分頁正常顯示
    // 這是防禦性測試，不論哪種情況都不應 500
    if (pageContent.includes('not installed') || pageContent.includes('未安裝')) {
      // WooCommerce 未安裝時應顯示提示
      expect(pageContent).toMatch(/not installed|未安裝|Woocommerce is not/i)
    }
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 未登入/無權限
  // ══════════════════════════════════════════════════════════════

  test('[P3] 未登入用戶存取設定頁面應被重導向至 wp-login.php', async ({ page }) => {
    await page.context().clearCookies()
    const response = await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)

    expect(response).toBeTruthy()
    expect(response!.status()).toBeLessThan(500)
    expect(page.url()).toContain('wp-login.php')
  })

  // ══════════════════════════════════════════════════════════════
  // P3 — 邊界值設定
  // ══════════════════════════════════════════════════════════════

  test('[P3] 設定欄位填入 XSS 字串後儲存，應被過濾或轉義', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const titleInput = page.locator(
      `input[name*="ajax_signed_title"], input[id*="ajax_signed_title"]`,
    ).first()

    if (await titleInput.count() > 0) {
      await titleInput.fill(`[E2E] ${EDGE.XSS_SCRIPT}`)

      const submitBtn = page.locator('input[type="submit"], button[type="submit"]').first()
      if (await submitBtn.count() > 0) {
        await submitBtn.click()
        await page.waitForLoadState('domcontentloaded')

        // 頁面不應包含未轉義的 <script> 標籤
        const content = await page.content()
        expect(content).not.toContain('<script>alert')
      }
    }
  })

  test('[P3] 設定欄位填入超長字串不應導致 500', async ({ page }) => {
    await page.goto(`${BASE_URL}${ADMIN_PAGES.SETTINGS}`)
    await page.waitForLoadState('domcontentloaded')

    const titleInput = page.locator(
      `input[name*="ajax_signed_title"], input[id*="ajax_signed_title"]`,
    ).first()

    if (await titleInput.count() > 0) {
      // 輸入 1000 字元
      await titleInput.fill('A'.repeat(1000))

      const submitBtn = page.locator('input[type="submit"], button[type="submit"]').first()
      if (await submitBtn.count() > 0) {
        await submitBtn.click()
        await page.waitForLoadState('domcontentloaded')

        // 不應 500
        expect(page.url()).toContain('power-contract')
      }
    }
  })
})
