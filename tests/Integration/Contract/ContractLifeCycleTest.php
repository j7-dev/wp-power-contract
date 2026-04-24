<?php
/**
 * 合約生命週期（狀態轉換）整合測試
 * 驗證 pending → approved / rejected 的狀態機與對應 hooks
 *
 * @group contract
 * @group lifecycle
 */

declare( strict_types=1 );

namespace Tests\Integration\Contract;

use Tests\Integration\TestCase;
use J7\PowerContract\Resources\Contract\Init as ContractInit;

/**
 * Class ContractLifeCycleTest
 * 測試合約狀態轉換與 lifecycle hooks
 */
class ContractLifeCycleTest extends TestCase {

	/** @var int 測試用合約模板 ID */
	private int $template_id;

	/** @var int 測試用合約 ID */
	private int $contract_id;

	/**
	 * 初始化依賴
	 */
	protected function configure_dependencies(): void {
		// 直接使用 WordPress APIs
	}

	/**
	 * 每個測試前建立測試資料
	 */
	public function set_up(): void {
		parent::set_up();

		$this->template_id = $this->create_contract_template(
			[ 'post_title' => '服務合約模板' ]
		);
		$this->contract_id = $this->create_contract(
			$this->template_id,
			[
				'user_name'  => '李小華',
				'user_phone' => '0987654321',
			]
		);
	}

	// ========== 快樂路徑（Happy Flow）==========

	/**
	 * @test
	 * @group happy
	 * 新建合約狀態應為 pending（審核中）
	 */
	public function test_新建合約狀態為pending(): void {
		$this->assert_contract_status( $this->contract_id, 'pending' );
	}

	/**
	 * @test
	 * @group happy
	 * 管理員核准合約後狀態應變為 approved
	 */
	public function test_核准合約後狀態變為approved(): void {
		$this->update_contract_status( $this->contract_id, 'approved' );
		$this->assert_contract_status( $this->contract_id, 'approved' );
	}

	/**
	 * @test
	 * @group happy
	 * 管理員拒絕合約後狀態應變為 rejected
	 */
	public function test_拒絕合約後狀態變為rejected(): void {
		$this->update_contract_status( $this->contract_id, 'rejected' );
		$this->assert_contract_status( $this->contract_id, 'rejected' );
	}

	/**
	 * @test
	 * @group happy
	 * 狀態轉為 pending 時觸發 power_contract_contract_pending action
	 */
	public function test_轉為pending時觸發對應action(): void {
		// 先設為 approved，再轉回 pending
		$this->update_contract_status( $this->contract_id, 'approved' );
		$fired_count_before = did_action( 'power_contract_contract_pending' );

		$this->update_contract_status( $this->contract_id, 'pending' );

		$this->assertGreaterThan(
			$fired_count_before,
			did_action( 'power_contract_contract_pending' ),
			"power_contract_contract_pending action 未被觸發"
		);
	}

	/**
	 * @test
	 * @group happy
	 * 狀態轉為 approved 時觸發 power_contract_contract_approved action
	 */
	public function test_轉為approved時觸發對應action(): void {
		$fired_count_before = did_action( 'power_contract_contract_approved' );

		$this->update_contract_status( $this->contract_id, 'approved' );

		$this->assertGreaterThan(
			$fired_count_before,
			did_action( 'power_contract_contract_approved' ),
			"power_contract_contract_approved action 未被觸發"
		);
	}

	/**
	 * @test
	 * @group happy
	 * 狀態轉為 rejected 時觸發 power_contract_contract_rejected action
	 */
	public function test_轉為rejected時觸發對應action(): void {
		$fired_count_before = did_action( 'power_contract_contract_rejected' );

		$this->update_contract_status( $this->contract_id, 'rejected' );

		$this->assertGreaterThan(
			$fired_count_before,
			did_action( 'power_contract_contract_rejected' ),
			"power_contract_contract_rejected action 未被觸發"
		);
	}

	/**
	 * @test
	 * @group happy
	 * 非合約 post type 的狀態轉換不應觸發合約相關 action
	 */
	public function test_非合約文章的狀態轉換不觸發合約action(): void {
		// 建立一般 post
		$regular_post_id = $this->factory()->post->create(
			[
				'post_type'   => 'post',
				'post_status' => 'draft',
			]
		);

		$fired_before = did_action( 'power_contract_contract_approved' );

		// 更新一般 post 狀態
		wp_update_post(
			[
				'ID'          => $regular_post_id,
				'post_status' => 'publish',
			]
		);

		$this->assertSame(
			$fired_before,
			did_action( 'power_contract_contract_approved' ),
			"一般文章的狀態轉換不應觸發 power_contract_contract_approved"
		);
	}

	// ========== 錯誤處理（Error Handling）==========

	/**
	 * @test
	 * @group error
	 * 核准不存在的合約應回傳 WP_Error 或 0
	 */
	public function test_核准不存在合約回傳錯誤(): void {
		$result = wp_update_post(
			[
				'ID'          => 999999999,
				'post_status' => 'approved',
			]
		);

		// wp_update_post 對不存在的 ID 回傳 0 或 WP_Error
		$this->assertTrue(
			0 === $result || $result instanceof \WP_Error,
			"核准不存在的合約應回傳 0 或 WP_Error，實際回傳：" . print_r( $result, true )
		);
	}

	// ========== 邊緣案例（Edge Cases）==========

	/**
	 * @test
	 * @group edge
	 * 合約從 approved 狀態轉回 pending（重新審核）
	 */
	public function test_已核准合約可重新設為pending(): void {
		$this->update_contract_status( $this->contract_id, 'approved' );
		$this->assert_contract_status( $this->contract_id, 'approved' );

		$this->update_contract_status( $this->contract_id, 'pending' );
		$this->assert_contract_status( $this->contract_id, 'pending' );
	}

	/**
	 * @test
	 * @group edge
	 * 合約從 rejected 狀態轉為 approved（補救審核）
	 */
	public function test_已拒絕合約可被核准(): void {
		$this->update_contract_status( $this->contract_id, 'rejected' );
		$this->assert_contract_status( $this->contract_id, 'rejected' );

		$this->update_contract_status( $this->contract_id, 'approved' );
		$this->assert_contract_status( $this->contract_id, 'approved' );
	}

	/**
	 * @test
	 * @group edge
	 * 批量更新多份合約狀態
	 */
	public function test_批量更新多份合約狀態(): void {
		$template_id  = $this->create_contract_template();
		$contract_ids = [];

		for ( $i = 0; $i < 5; $i++ ) {
			$contract_ids[] = $this->create_contract(
				$template_id,
				[ 'user_name' => "批量用戶_{$i}" ]
			);
		}

		// 批量設為 approved
		foreach ( $contract_ids as $contract_id ) {
			$this->update_contract_status( $contract_id, 'approved' );
		}

		// 驗證全部都是 approved
		foreach ( $contract_ids as $contract_id ) {
			$this->assert_contract_status( $contract_id, 'approved' );
		}
	}

	/**
	 * @test
	 * @group edge
	 * 相同狀態重複設定不應出錯
	 */
	public function test_重複設定相同狀態不出錯(): void {
		// 已是 pending，再次設定 pending
		$result = $this->update_contract_status( $this->contract_id, 'pending' );
		$this->assert_contract_status( $this->contract_id, 'pending' );
		$this->assertIsInt( $result );
	}
}
