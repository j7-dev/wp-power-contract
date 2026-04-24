<?php
/**
 * 合約 CPT 整合測試
 * 驗證 contract 自訂文章類型的註冊、自訂狀態與 meta 欄位
 *
 * @group contract
 * @group smoke
 */

declare( strict_types=1 );

namespace Tests\Integration\Contract;

use Tests\Integration\TestCase;
use J7\PowerContract\Resources\Contract\Init as ContractInit;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplateInit;

/**
 * Class ContractCPTTest
 * 測試 contract CPT 的基礎功能
 */
class ContractCPTTest extends TestCase {

	/**
	 * 初始化依賴
	 */
	protected function configure_dependencies(): void {
		// 直接使用 WordPress APIs
	}

	// ========== 冒煙測試（Smoke Tests）==========

	/**
	 * @test
	 * @group smoke
	 * 確認 contract CPT 已正確註冊
	 */
	public function test_contract_CPT已正確註冊(): void {
		$post_types = get_post_types();
		$this->assertArrayHasKey(
			ContractInit::POST_TYPE,
			$post_types,
			'contract CPT 未被註冊'
		);
	}

	/**
	 * @test
	 * @group smoke
	 * 確認 contract_template CPT 已正確註冊
	 */
	public function test_合約模板CPT已正確註冊(): void {
		$post_types = get_post_types();
		$this->assertArrayHasKey(
			ContractTemplateInit::POST_TYPE,
			$post_types,
			'contract_template CPT 未被註冊'
		);
	}

	/**
	 * @test
	 * @group smoke
	 * 確認自訂狀態 approved 已被註冊
	 */
	public function test_approved狀態已正確註冊(): void {
		$statuses = get_post_stati();
		$this->assertArrayHasKey(
			'approved',
			$statuses,
			'approved 狀態未被註冊'
		);
	}

	/**
	 * @test
	 * @group smoke
	 * 確認自訂狀態 rejected 已被註冊
	 */
	public function test_rejected狀態已正確註冊(): void {
		$statuses = get_post_stati();
		$this->assertArrayHasKey(
			'rejected',
			$statuses,
			'rejected 狀態未被註冊'
		);
	}

	// ========== 快樂路徑（Happy Flow）==========

	/**
	 * @test
	 * @group happy
	 * 建立合約模板並確認可被查詢
	 */
	public function test_建立合約模板成功(): void {
		$template_id = $this->create_contract_template(
			[
				'post_title' => '標準服務合約模板',
			]
		);

		$this->assertGreaterThan( 0, $template_id, '合約模板 ID 應大於 0' );

		$template = get_post( $template_id );
		$this->assertInstanceOf( \WP_Post::class, $template );
		$this->assertSame( ContractTemplateInit::POST_TYPE, $template->post_type );
		$this->assertSame( '標準服務合約模板', $template->post_title );
		$this->assertSame( 'publish', $template->post_status );
	}

	/**
	 * @test
	 * @group happy
	 * 建立合約並設定初始狀態為 pending
	 */
	public function test_建立合約初始狀態為pending(): void {
		$template_id = $this->create_contract_template();
		$contract_id = $this->create_contract( $template_id );

		$this->assertGreaterThan( 0, $contract_id );
		$this->assert_contract_status( $contract_id, 'pending' );
	}

	/**
	 * @test
	 * @group happy
	 * 建立合約後 meta 欄位應正確儲存
	 */
	public function test_建立合約meta欄位正確儲存(): void {
		$template_id = $this->create_contract_template();
		$contract_id = $this->create_contract(
			$template_id,
			[
				'user_name'       => '王小明',
				'user_phone'      => '0912345678',
				'user_identity'   => 'A123456789',
				'contract_amount' => '50000',
				'client_ip'       => '192.168.1.1',
			]
		);

		$this->assert_contract_meta( $contract_id, 'user_name', '王小明' );
		$this->assert_contract_meta( $contract_id, 'user_phone', '0912345678' );
		$this->assert_contract_meta( $contract_id, 'user_identity', 'A123456789' );
		$this->assert_contract_meta( $contract_id, 'contract_amount', '50000' );
		$this->assert_contract_meta( $contract_id, 'client_ip', '192.168.1.1' );
		$this->assert_contract_meta( $contract_id, 'contract_template_id', (string) $template_id );
	}

	/**
	 * @test
	 * @group happy
	 * 合約與模板的關聯正確建立
	 */
	public function test_合約與模板關聯正確(): void {
		$template_id = $this->create_contract_template(
			[ 'post_title' => '服務合約 A' ]
		);
		$contract_id = $this->create_contract( $template_id );

		$stored_template_id = (int) $this->get_contract_meta( $contract_id, 'contract_template_id' );
		$this->assertSame( $template_id, $stored_template_id, '合約的 contract_template_id 應指向正確的模板' );
	}

	/**
	 * @test
	 * @group happy
	 * 合約模板設定公司章 seal_url
	 */
	public function test_合約模板設定公司章(): void {
		$seal_url    = 'https://example.com/seal.png';
		$template_id = $this->create_contract_template(
			[ 'seal_url' => $seal_url ]
		);

		$stored_url = get_post_meta( $template_id, 'seal_url', true );
		$this->assertSame( $seal_url, $stored_url, '公司章 URL 應正確儲存' );
	}

	// ========== 錯誤處理（Error Handling）==========

	/**
	 * @test
	 * @group error
	 * 查詢不存在的合約應回傳 null
	 */
	public function test_查詢不存在的合約回傳null(): void {
		$contract = get_post( 999999999 );
		$this->assertNull( $contract, '不存在的合約應回傳 null' );
	}

	/**
	 * @test
	 * @group error
	 * 已刪除的合約不應被一般查詢取得
	 */
	public function test_已刪除合約不被一般查詢取得(): void {
		$template_id = $this->create_contract_template();
		$contract_id = $this->create_contract( $template_id );

		// 刪除合約（移至垃圾桶）
		wp_trash_post( $contract_id );

		$contracts = get_posts(
			[
				'post_type'      => ContractInit::POST_TYPE,
				'post_status'    => 'pending',
				'posts_per_page' => -1,
			]
		);

		$contract_ids = wp_list_pluck( $contracts, 'ID' );
		$this->assertNotContains( $contract_id, $contract_ids, '已刪除的合約不應出現在 pending 列表中' );
	}

	// ========== 邊緣案例（Edge Cases）==========

	/**
	 * @test
	 * @group edge
	 * 合約標題超長字串（255+ 字元）應能正常儲存
	 */
	public function test_超長合約標題能正常儲存(): void {
		$long_title  = str_repeat( '測試合約標題超長字串測試', 30 ); // 360 字元
		$template_id = $this->create_contract_template();
		$contract_id = $this->create_contract(
			$template_id,
			[ 'post_title' => $long_title ]
		);

		$contract = get_post( $contract_id );
		$this->assertNotNull( $contract );
		// WordPress 的 post_title 不限長度（儲存於 TEXT 欄位）
		$this->assertSame( $long_title, $contract->post_title );
	}

	/**
	 * @test
	 * @group edge
	 * 合約用戶名稱含有 Unicode 與 Emoji 應能正常儲存
	 */
	public function test_用戶名稱含Unicode與Emoji能正常儲存(): void {
		$template_id = $this->create_contract_template();
		$user_name   = '王小明 🎉 テスト العربية';
		$contract_id = $this->create_contract(
			$template_id,
			[ 'user_name' => $user_name ]
		);

		$stored_name = $this->get_contract_meta( $contract_id, 'user_name' );
		$this->assertSame( $user_name, $stored_name, 'Unicode/Emoji 名稱應正確儲存' );
	}

	/**
	 * @test
	 * @group edge
	 * 合約金額為 0 應能正常儲存
	 */
	public function test_合約金額為零能正常儲存(): void {
		$template_id = $this->create_contract_template();
		$contract_id = $this->create_contract(
			$template_id,
			[ 'contract_amount' => '0' ]
		);

		$this->assert_contract_meta( $contract_id, 'contract_amount', '0' );
	}

	/**
	 * @test
	 * @group edge
	 * 合約金額為負數應能儲存（業務層未限制）
	 */
	public function test_合約金額為負數能儲存(): void {
		$template_id = $this->create_contract_template();
		$contract_id = $this->create_contract(
			$template_id,
			[ 'contract_amount' => '-1000' ]
		);

		$this->assert_contract_meta( $contract_id, 'contract_amount', '-1000' );
	}

	/**
	 * @test
	 * @group edge
	 * 同一個模板可建立多份合約
	 */
	public function test_同一模板可建立多份合約(): void {
		$template_id = $this->create_contract_template();

		$contract_id_1 = $this->create_contract( $template_id, [ 'user_name' => '用戶一' ] );
		$contract_id_2 = $this->create_contract( $template_id, [ 'user_name' => '用戶二' ] );
		$contract_id_3 = $this->create_contract( $template_id, [ 'user_name' => '用戶三' ] );

		$this->assertNotSame( $contract_id_1, $contract_id_2 );
		$this->assertNotSame( $contract_id_2, $contract_id_3 );

		// 三份合約都指向同一模板
		$this->assert_contract_meta( $contract_id_1, 'contract_template_id', (string) $template_id );
		$this->assert_contract_meta( $contract_id_2, 'contract_template_id', (string) $template_id );
		$this->assert_contract_meta( $contract_id_3, 'contract_template_id', (string) $template_id );
	}

	// ========== 安全性（Security）==========

	/**
	 * @test
	 * @group security
	 * 合約 meta 中存入 XSS 字串應被原樣儲存（輸出時才跳脫，非存入時）
	 */
	public function test_XSS字串存入meta後可被原樣取出(): void {
		$template_id = $this->create_contract_template();
		$xss_string  = '<script>alert("xss")</script>';
		$contract_id = $this->create_contract(
			$template_id,
			[ 'user_name' => $xss_string ]
		);

		// WordPress post meta 不做 HTML 跳脫（存入原始值，輸出時才跳脫）
		$stored = $this->get_contract_meta( $contract_id, 'user_name' );
		$this->assertSame( $xss_string, $stored, 'Meta 應儲存原始值' );
	}

	/**
	 * @test
	 * @group security
	 * 合約 meta 中存入 SQL Injection 字串應被原樣儲存
	 */
	public function test_SQL_Injection字串存入meta後可被原樣取出(): void {
		$template_id   = $this->create_contract_template();
		$sql_injection = "'; DROP TABLE wp_posts; --";
		$contract_id   = $this->create_contract(
			$template_id,
			[ 'user_name' => $sql_injection ]
		);

		$stored = $this->get_contract_meta( $contract_id, 'user_name' );
		$this->assertSame( $sql_injection, $stored, 'SQL Injection 字串應安全儲存（wpdb 已 prepare）' );
	}
}
