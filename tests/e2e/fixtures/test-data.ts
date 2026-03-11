/**
 * Test Data — power-contract E2E 測試常數與測試資料
 */
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Base URL ────────────────────────────────────────────────
export const BASE_URL = 'http://localhost:8892'

// ─── AJAX / Admin-Post Endpoints ─────────────────────────────
export const EP = {
  /** WordPress AJAX endpoint */
  AJAX: '/wp-admin/admin-ajax.php',
  /** WordPress Admin-Post endpoint */
  ADMIN_POST: '/wp-admin/admin-post.php',

  /** WP REST: contract CPT */
  WP_CONTRACTS: 'wp/v2/contract',
  WP_CONTRACT: (id: number | string) => `wp/v2/contract/${id}`,

  /** WP REST: contract_template CPT */
  WP_TEMPLATES: 'wp/v2/contract_template',
  WP_TEMPLATE: (id: number | string) => `wp/v2/contract_template/${id}`,

  /** WP REST: users */
  WP_USERS: 'wp/v2/users',

  /** WP REST: settings (options) */
  WP_OPTIONS: 'wp/v2/settings',

  /** WooCommerce REST */
  WC_ORDERS: 'wc/v3/orders',
  WC_ORDER: (id: number | string) => `wc/v3/orders/${id}`,
  WC_PRODUCTS: 'wc/v3/products',
} as const

// ─── AJAX Action Names ───────────────────────────────────────
export const AJAX_ACTION = {
  CREATE_CONTRACT: 'create_contract',
  APPROVE_CONTRACT: 'approve_contract',
  REJECT_CONTRACT: 'reject_contract',
} as const

// ─── Contract Statuses ───────────────────────────────────────
export const CONTRACT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

// ─── Bulk Action Names ───────────────────────────────────────
export const BULK_ACTION = {
  TO_PENDING: 'change-to-pending',
  TO_APPROVED: 'change-to-approved',
  TO_REJECTED: 'change-to-rejected',
} as const

// ─── Contract Template Status ────────────────────────────────
export const TEMPLATE_STATUS = {
  PUBLISH: 'publish',
  DRAFT: 'draft',
} as const

// ─── Settings Keys ───────────────────────────────────────────
export const SETTINGS_KEY = 'power_contract_settings'

export const SETTINGS_FIELDS = {
  AJAX_SIGNED_TITLE: 'ajax_signed_title',
  AJAX_SIGNED_DESCRIPTION: 'ajax_signed_description',
  AJAX_SIGNED_BTN_TEXT: 'ajax_signed_btn_text',
  AJAX_SIGNED_BTN_LINK: 'ajax_signed_btn_link',
  DISPLAY_ORDER_INFO: 'display_order_info',
  DISPLAY_CONTRACT_BEFORE_CHECKOUT: 'display_contract_before_checkout',
  DISPLAY_CONTRACT_AFTER_CHECKOUT: 'display_contract_after_checkout',
  EMAILS: 'emails',
  CHOSEN_CONTRACT_TEMPLATE: 'chosen_contract_template',
} as const

// ─── Test Template Data ──────────────────────────────────────
export const TEST_TEMPLATE = {
  TITLE: '[E2E] 測試合約模板',
  CONTENT: `
    <h2>測試合約</h2>
    <p>甲方（以下簡稱「本公司」）與乙方（以下簡稱「簽署者」）同意以下條款：</p>
    <p>姓名：[pct_input name="user_name"]</p>
    <p>地址：[pct_input name="user_address"]</p>
    <p>身分證字號：[pct_input name="user_identity"]</p>
    <p>手機號碼：[pct_input name="user_phone"]</p>
    <p>合約金額：[pct_input name="contract_amount"]</p>
    <p>公司章：[pct_seal]</p>
    <p>簽名：[pct_signature]</p>
    <p>日期：[pct_date]</p>
    <p>IP：[pct_ip]</p>
  `.trim(),
  STATUS: 'publish',
} as const

// ─── Test Contract Data ──────────────────────────────────────
export const TEST_CONTRACT = {
  USER_NAME: '[E2E] 王小明',
  USER_ADDRESS: '[E2E] 台北市信義區測試路 123 號',
  USER_IDENTITY: 'A123456789',
  USER_PHONE: '0912345678',
  CONTRACT_AMOUNT: '50000',
  // Minimal base64 1x1 PNG for signature
  SIGNATURE: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  SCREENSHOT: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
} as const

// ─── Test Settings Data ──────────────────────────────────────
export const TEST_SETTINGS = {
  AJAX_SIGNED_TITLE: '[E2E] 已收到您的合約簽屬',
  AJAX_SIGNED_DESCRIPTION: '[E2E] 審閱需要 3~5 天',
  AJAX_SIGNED_BTN_TEXT: '[E2E] 繼續結帳',
  AJAX_SIGNED_BTN_LINK: 'https://example.com/checkout',
  EMAILS: ['e2e-admin@example.com', 'e2e-hr@example.com'],
} as const

// ─── Admin Pages ─────────────────────────────────────────────
export const ADMIN_PAGES = {
  CONTRACT_LIST: '/wp-admin/edit.php?post_type=contract',
  CONTRACT_EDIT: (id: number | string) => `/wp-admin/post.php?post=${id}&action=edit`,
  TEMPLATE_LIST: '/wp-admin/edit.php?post_type=contract_template',
  TEMPLATE_EDIT: (id: number | string) => `/wp-admin/post.php?post=${id}&action=edit`,
  TEMPLATE_NEW: '/wp-admin/post-new.php?post_type=contract_template',
  SETTINGS: '/wp-admin/admin.php?page=power-contract-settings',
  WC_ORDERS: '/wp-admin/edit.php?post_type=shop_order',
} as const

// ─── Edge Case Strings ───────────────────────────────────────
export const EDGE = {
  XSS_SCRIPT: '<script>alert("xss")</script>',
  XSS_IMG: '<img src=x onerror=alert(1)>',
  XSS_SVG: '<svg/onload=alert(1)>',
  SQL_INJECTION_1: "'; DROP TABLE wp_options; --",
  SQL_INJECTION_2: "1' OR '1'='1",
  SQL_INJECTION_3: "1; SELECT * FROM wp_users --",
  UNICODE_CJK: '測試中文字串',
  UNICODE_JAPANESE: 'テスト',
  UNICODE_KOREAN: '테스트',
  EMOJI: '🎉🚀💰',
  EMOJI_COMPLEX: '👨‍👩‍👧‍👦🏳️‍🌈',
  EMPTY_STRING: '',
  WHITESPACE_ONLY: '   ',
  VERY_LONG_STRING: 'A'.repeat(10_000),
  NULL_BYTE: 'test\x00null',
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~',
  HTML_ENTITIES: '&amp;&lt;&gt;&quot;',
  NEGATIVE_NUMBER: -1,
  ZERO: 0,
  FLOAT_NUMBER: 0.001,
  MAX_INT: 2_147_483_647,
  HUGE_NUMBER: 999_999_999_999,
} as const

// ─── Test Order Constants ────────────────────────────────────
export const TEST_ORDER = {
  TOTAL: '50000',
  STATUS_PROCESSING: 'processing',
  STATUS_PENDING: 'pending',
  NONEXISTENT_ID: 9999999,
} as const

// ─── Test IDs File ───────────────────────────────────────────
export const TEST_IDS_FILE = path.resolve(
  __dirname,
  '../.auth/test-ids.json',
)

export interface TestIds {
  templateId?: number
  contractId?: number
  contractId2?: number
  contractId3?: number
  orderId?: number
  customerId?: number
  [key: string]: unknown
}

export function loadTestIds(): TestIds {
  try {
    return JSON.parse(fs.readFileSync(TEST_IDS_FILE, 'utf-8'))
  } catch {
    return {}
  }
}
