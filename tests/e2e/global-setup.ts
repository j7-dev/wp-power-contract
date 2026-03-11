/**
 * Global Setup — power-contract E2E 測試初始化
 *
 * 1. Apply LC bypass
 * 2. Login as admin, save auth state & nonce
 * 3. Create test data: contract template, test contracts, WC order
 * 4. Save IDs to .auth/test-ids.json
 */
import { chromium, type FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { applyLcBypass } from './helpers/lc-bypass.js'
import { loginAsAdmin, AUTH_FILE } from './helpers/admin-setup.js'
import {
  BASE_URL,
  TEST_IDS_FILE,
  TEST_TEMPLATE,
  TEST_CONTRACT,
  EP,
  CONTRACT_STATUS,
  type TestIds,
} from './fixtures/test-data.js'

async function globalSetup(_config: FullConfig) {
  console.log('\n🚀 E2E Global Setup (power-contract)')

  // ── 0. Ensure .auth directory exists ──
  const authDir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  // ── 1. Apply LC bypass ──
  try {
    applyLcBypass()
  } catch (e) {
    console.warn('LC bypass 跳過:', (e as Error).message)
  }

  // ── 2. Login as admin ──
  console.log('🔑 登入管理員...')
  const nonce = await loginAsAdmin(BASE_URL)
  console.log('✅ Nonce 已取得:', nonce.slice(0, 6) + '...')

  // ── 3. Create test data via REST API ──
  console.log('📦 建立測試資料...')
  const testIds: TestIds = {}

  try {
    const browser = await chromium.launch()
    const context = await browser.newContext({ storageState: AUTH_FILE })
    const api = context.request

    const jsonHeaders = {
      'X-WP-Nonce': nonce,
      'Content-Type': 'application/json',
    }

    // ── 3a. Create a contract template ──
    const templateRes = await api.post(`${BASE_URL}/wp-json/${EP.WP_TEMPLATES}`, {
      headers: jsonHeaders,
      data: {
        title: TEST_TEMPLATE.TITLE,
        content: TEST_TEMPLATE.CONTENT,
        status: TEST_TEMPLATE.STATUS,
      },
    })

    if (templateRes.ok()) {
      const tmpl = await templateRes.json()
      testIds.templateId = tmpl.id
      console.log(`  ✅ 合約模板已建立: #${tmpl.id}`)
    } else {
      console.warn('  ⚠️ 建立合約模板失敗:', templateRes.status(), await templateRes.text().catch(() => ''))
    }

    // ── 3b. Create test contracts via REST API (contract CPT) ──
    // Contract 1: pending status
    const contract1Res = await api.post(`${BASE_URL}/wp-json/${EP.WP_CONTRACTS}`, {
      headers: jsonHeaders,
      data: {
        title: `[E2E] 測試合約 - ${TEST_CONTRACT.USER_NAME} (pending)`,
        status: CONTRACT_STATUS.PENDING,
        meta: {
          contract_template_id: testIds.templateId ?? 0,
          user_name: TEST_CONTRACT.USER_NAME,
          user_address: TEST_CONTRACT.USER_ADDRESS,
          user_identity: TEST_CONTRACT.USER_IDENTITY,
          user_phone: TEST_CONTRACT.USER_PHONE,
          contract_amount: TEST_CONTRACT.CONTRACT_AMOUNT,
          client_ip: '127.0.0.1',
        },
      },
    })

    if (contract1Res.ok()) {
      const c1 = await contract1Res.json()
      testIds.contractId = c1.id
      console.log(`  ✅ 測試合約 #1 (pending) 已建立: #${c1.id}`)
    } else {
      console.warn('  ⚠️ 建立測試合約 #1 失敗:', contract1Res.status(), await contract1Res.text().catch(() => ''))
    }

    // Contract 2: pending (for approve test)
    const contract2Res = await api.post(`${BASE_URL}/wp-json/${EP.WP_CONTRACTS}`, {
      headers: jsonHeaders,
      data: {
        title: `[E2E] 測試合約 - ${TEST_CONTRACT.USER_NAME} (for-approve)`,
        status: CONTRACT_STATUS.PENDING,
        meta: {
          contract_template_id: testIds.templateId ?? 0,
          user_name: TEST_CONTRACT.USER_NAME,
          user_phone: TEST_CONTRACT.USER_PHONE,
          client_ip: '127.0.0.1',
        },
      },
    })

    if (contract2Res.ok()) {
      const c2 = await contract2Res.json()
      testIds.contractId2 = c2.id
      console.log(`  ✅ 測試合約 #2 (for-approve) 已建立: #${c2.id}`)
    } else {
      console.warn('  ⚠️ 建立測試合約 #2 失敗:', contract2Res.status())
    }

    // Contract 3: pending (for reject test)
    const contract3Res = await api.post(`${BASE_URL}/wp-json/${EP.WP_CONTRACTS}`, {
      headers: jsonHeaders,
      data: {
        title: `[E2E] 測試合約 - ${TEST_CONTRACT.USER_NAME} (for-reject)`,
        status: CONTRACT_STATUS.PENDING,
        meta: {
          contract_template_id: testIds.templateId ?? 0,
          user_name: TEST_CONTRACT.USER_NAME,
          user_phone: TEST_CONTRACT.USER_PHONE,
          client_ip: '127.0.0.1',
        },
      },
    })

    if (contract3Res.ok()) {
      const c3 = await contract3Res.json()
      testIds.contractId3 = c3.id
      console.log(`  ✅ 測試合約 #3 (for-reject) 已建立: #${c3.id}`)
    } else {
      console.warn('  ⚠️ 建立測試合約 #3 失敗:', contract3Res.status())
    }

    // ── 3c. Create a WooCommerce test order (if WC is active) ──
    try {
      const orderRes = await api.post(`${BASE_URL}/wp-json/${EP.WC_ORDERS}`, {
        headers: jsonHeaders,
        data: {
          status: 'processing',
          billing: {
            first_name: '[E2E]',
            last_name: '合約測試',
            email: 'e2e-contract@example.com',
            address_1: '[E2E] 測試地址',
            city: 'Taipei',
            country: 'TW',
          },
          line_items: [
            {
              name: '[E2E] 合約測試商品',
              quantity: 1,
              total: '50000',
            },
          ],
        },
      })

      if (orderRes.ok()) {
        const order = await orderRes.json()
        testIds.orderId = order.id
        console.log(`  ✅ WC 測試訂單已建立: #${order.id}`)
      } else {
        console.warn('  ⚠️ 建立 WC 測試訂單失敗（WooCommerce 可能未啟用）:', orderRes.status())
      }
    } catch {
      console.warn('  ⚠️ WooCommerce 可能未啟用，跳過訂單建立')
    }

    // ── 3d. Create/ensure a test customer user ──
    try {
      const userRes = await api.post(`${BASE_URL}/wp-json/${EP.WP_USERS}`, {
        headers: jsonHeaders,
        data: {
          username: 'e2e_contract_customer',
          email: 'e2e-customer@example.com',
          password: 'e2e_customer_pass',
          roles: ['customer'],
          first_name: '[E2E]',
          last_name: '客戶',
        },
      })
      if (userRes.ok()) {
        const user = await userRes.json()
        testIds.customerId = user.id
        console.log(`  ✅ 測試客戶已建立: #${user.id}`)
      } else {
        console.warn('  ⚠️ 建立測試客戶失敗（可能已存在）:', userRes.status())
      }
    } catch {
      console.warn('  ⚠️ 建立測試客戶跳過')
    }

    await browser.close()
  } catch (e) {
    console.warn('⚠️ 建立測試資料時出錯（非致命）:', (e as Error).message)
  }

  // ── 4. Save test IDs ──
  fs.writeFileSync(TEST_IDS_FILE, JSON.stringify(testIds, null, 2))
  console.log('💾 Test IDs 已儲存:', JSON.stringify(testIds))

  console.log('🎉 Global Setup 完成\n')
}

export default globalSetup
