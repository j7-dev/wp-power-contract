<?php
/**
 * 合約工具函式整合測試
 * 驗證 Utils::get_contracts_by_order_id 等工具方法
 *
 * @group contract
 * @group utils
 */

declare( strict_types=1 );

namespace Tests\Integration\Contract;

use Tests\Integration\TestCase;
use J7\PowerContract\Resources\Contract\Utils as ContractUtils;
use J7\PowerContract\Resources\Contract\Init as ContractInit;

/**
 * Class ContractUtilsTest
 * 測試 Contract\Utils 的工具方法
 */
class ContractUtilsTest extends TestCase {

	/** @var int 測試用合約模板 ID */
	private int $template_id;

	/**
	 * 初始化依賴
	 */
	protected function configure_dependencies(): void {
		// 直接使用 WordPress APIs
	}

	/**
	 * 每個測試前建立基礎測試資料
	 */
	public function set_up(): void {
		parent::set_up();
		$this->template_id = $this->create_contract_template();
	}

	// ========== 快樂路徑（Happy Flow）==========

	/**
	 * @test
	 * @group happy
	 * 透過訂單 ID 查詢關聯合約（有結果）
	 */
	public function test_透過訂單ID查詢關聯合約(): void {
		$mock_order_id = 12345;

		// 建立兩份關聯到同一訂單的合約
		$contract_id_1 = $this->create_contract(
			$this->template_id,
			[
				'user_name'  => '訂單用戶一',
				'meta_input' => [ '_order_id' => $mock_order_id ],
			]
		);
		$contract_id_2 = $this->create_contract(
			$this->template_id,
			[
				'user_name'  => '訂單用戶二',
				'meta_input' => [ '_order_id' => $mock_order_id ],
			]
		);

		$contracts = ContractUtils::get_contracts_by_order_id( $mock_order_id );

		$this->assertIsArray( $contracts );
		$this->assertCount( 2, $contracts, "應找到 2 份關聯合約" );

		$result_ids = wp_list_pluck( $contracts, 'ID' );
		$this->assertContains( $contract_id_1, $result_ids );
		$this->assertContains( $contract_id_2, $result_ids );
	}

	/**
	 * @test
	 * @group happy
	 * 查詢指定訂單的合約：查詢結果含所有狀態（any）
	 */
	public function test_查詢訂單合約包含所有狀態(): void {
		$mock_order_id = 99001;

		$pending_id  = $this->create_contract(
			$this->template_id,
			[
				'post_status' => 'pending',
				'meta_input'  => [ '_order_id' => $mock_order_id ],
			]
		);
		$approved_id = $this->create_contract(
			$this->template_id,
			[
				'post_status' => 'approved',
				'meta_input'  => [ '_order_id' => $mock_order_id ],
			]
		);
		$rejected_id = $this->create_contract(
			$this->template_id,
			[
				'post_status' => 'rejected',
				'meta_input'  => [ '_order_id' => $mock_order_id ],
			]
		);

		$contracts   = ContractUtils::get_contracts_by_order_id( $mock_order_id );
		$result_ids  = wp_list_pluck( $contracts, 'ID' );

		$this->assertContains( $pending_id, $result_ids, 'pending 狀態合約應包含在查詢結果' );
		$this->assertContains( $approved_id, $result_ids, 'approved 狀態合約應包含在查詢結果' );
		$this->assertContains( $rejected_id, $result_ids, 'rejected 狀態合約應包含在查詢結果' );
	}

	// ========== 錯誤處理（Error Handling）==========

	/**
	 * @test
	 * @group error
	 * 查詢不存在的訂單 ID 應回傳空陣列
	 */
	public function test_查詢不存在訂單ID回傳空陣列(): void {
		$contracts = ContractUtils::get_contracts_by_order_id( 999999999 );

		$this->assertIsArray( $contracts );
		$this->assertEmpty( $contracts, "查詢不存在的訂單 ID 應回傳空陣列" );
	}

	/**
	 * @test
	 * @group error
	 * 訂單 ID 為 0 應回傳空陣列
	 */
	public function test_訂單ID為零回傳空陣列(): void {
		$contracts = ContractUtils::get_contracts_by_order_id( 0 );

		$this->assertIsArray( $contracts );
		$this->assertEmpty( $contracts );
	}

	// ========== 邊緣案例（Edge Cases）==========

	/**
	 * @test
	 * @group edge
	 * 一份合約關聯到不同訂單：查詢各自訂單應各自找到一份
	 */
	public function test_不同訂單各自查詢結果獨立(): void {
		$order_id_1 = 10001;
		$order_id_2 = 10002;

		$contract_id_1 = $this->create_contract(
			$this->template_id,
			[ 'meta_input' => [ '_order_id' => $order_id_1 ] ]
		);
		$contract_id_2 = $this->create_contract(
			$this->template_id,
			[ 'meta_input' => [ '_order_id' => $order_id_2 ] ]
		);

		$contracts_1 = ContractUtils::get_contracts_by_order_id( $order_id_1 );
		$contracts_2 = ContractUtils::get_contracts_by_order_id( $order_id_2 );

		$this->assertCount( 1, $contracts_1 );
		$this->assertCount( 1, $contracts_2 );
		$this->assertSame( $contract_id_1, $contracts_1[0]->ID );
		$this->assertSame( $contract_id_2, $contracts_2[0]->ID );
	}

	/**
	 * @test
	 * @group edge
	 * 超大訂單 ID（接近 PHP_INT_MAX）查詢應回傳空陣列
	 */
	public function test_超大訂單ID查詢回傳空陣列(): void {
		$large_id  = PHP_INT_MAX;
		$contracts = ContractUtils::get_contracts_by_order_id( $large_id );

		$this->assertIsArray( $contracts );
		$this->assertEmpty( $contracts );
	}

	/**
	 * @test
	 * @group edge
	 * 同一訂單有大量合約（壓力測試）
	 */
	public function test_同一訂單大量合約查詢正確(): void {
		$mock_order_id = 77777;
		$count         = 20;
		$created_ids   = [];

		for ( $i = 0; $i < $count; $i++ ) {
			$created_ids[] = $this->create_contract(
				$this->template_id,
				[
					'user_name'  => "壓力測試用戶_{$i}",
					'meta_input' => [ '_order_id' => $mock_order_id ],
				]
			);
		}

		$contracts = ContractUtils::get_contracts_by_order_id( $mock_order_id );
		$this->assertCount( $count, $contracts, "應找到 {$count} 份合約" );
	}
}
