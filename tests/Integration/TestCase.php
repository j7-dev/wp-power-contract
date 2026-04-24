<?php
/**
 * 整合測試基礎類別
 * 所有 Power Contract 整合測試必須繼承此類別
 */

declare( strict_types=1 );

namespace Tests\Integration;

use J7\PowerContract\Resources\Contract\Init as ContractInit;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplateInit;

/**
 * Class TestCase
 * 整合測試基礎類別，提供共用 helper methods
 */
abstract class TestCase extends \WP_UnitTestCase {

	/**
	 * 最後發生的錯誤（用於驗證操作是否失敗）
	 *
	 * @var \Throwable|null
	 */
	protected ?\Throwable $lastError = null;

	/**
	 * 查詢結果（用於驗證 Query 操作的回傳值）
	 *
	 * @var mixed
	 */
	protected mixed $queryResult = null;

	/**
	 * ID 映射表（用戶名稱 → 用戶 ID 等）
	 *
	 * @var array<string, int>
	 */
	protected array $ids = [];

	/**
	 * Repository 容器（Power Contract 目前無自訂 Repository，保留以維持模式一致性）
	 *
	 * @var \stdClass
	 */
	protected \stdClass $repos;

	/**
	 * Service 容器
	 *
	 * @var \stdClass
	 */
	protected \stdClass $services;

	/**
	 * 設定（每個測試前執行）
	 */
	public function set_up(): void {
		parent::set_up();

		$this->lastError   = null;
		$this->queryResult = null;
		$this->ids         = [];
		$this->repos       = new \stdClass();
		$this->services    = new \stdClass();

		$this->configure_dependencies();
	}

	/**
	 * 初始化依賴（子類別必須實作）
	 */
	abstract protected function configure_dependencies(): void;

	// ========== 資料建立 Helper ==========

	/**
	 * 建立測試合約模板（contract_template CPT）
	 *
	 * @param array<string, mixed> $args 覆蓋預設值
	 * @return int 合約模板 ID
	 */
	protected function create_contract_template( array $args = [] ): int {
		$defaults = [
			'post_title'   => '測試合約模板',
			'post_status'  => 'publish',
			'post_type'    => ContractTemplateInit::POST_TYPE,
			'post_content' => '<p>甲方（委託方）：[pct_input name="user_name"]</p><p>[pct_signature]</p>',
		];

		$post_args   = wp_parse_args( $args, $defaults );
		$template_id = $this->factory()->post->create( $post_args );

		if ( isset( $args['seal_url'] ) ) {
			update_post_meta( $template_id, 'seal_url', $args['seal_url'] );
		}

		return $template_id;
	}

	/**
	 * 建立測試合約（contract CPT）
	 *
	 * @param int                  $template_id 合約模板 ID
	 * @param array<string, mixed> $args 覆蓋預設值
	 * @return int 合約 ID
	 */
	protected function create_contract( int $template_id, array $args = [] ): int {
		$defaults = [
			'post_title'  => '測試合約模板 合約 - 測試用戶',
			'post_status' => 'pending',
			'post_type'   => ContractInit::POST_TYPE,
		];

		$meta_defaults = [
			'contract_template_id' => $template_id,
			'user_name'            => '測試用戶',
			'user_phone'           => '0912345678',
			'user_address'         => '台北市中正區測試路1號',
			'user_identity'        => 'A123456789',
			'contract_amount'      => '10000',
			'client_ip'            => '127.0.0.1',
			'screenshot_url'       => 'https://example.com/screenshot.png',
			'signature'            => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
		];

		$post_args = wp_parse_args( $args, $defaults );

		// 從 args 提取 meta，其餘為 post 資料
		$meta_keys = array_keys( $meta_defaults );
		$meta_data = [];
		foreach ( $meta_keys as $key ) {
			if ( isset( $args[ $key ] ) ) {
				$meta_data[ $key ] = $args[ $key ];
				unset( $post_args[ $key ] );
			} else {
				$meta_data[ $key ] = $meta_defaults[ $key ];
			}
		}

		// 支援透過 meta_input 直接傳入
		if ( isset( $args['meta_input'] ) ) {
			$meta_data = array_merge( $meta_data, $args['meta_input'] );
			unset( $post_args['meta_input'] );
		}

		$post_args['meta_input'] = $meta_data;

		$contract_id = $this->factory()->post->create( $post_args );

		return $contract_id;
	}

	/**
	 * 更新合約狀態
	 *
	 * @param int    $contract_id 合約 ID
	 * @param string $status 新狀態：pending | approved | rejected
	 * @return int|\WP_Error
	 */
	protected function update_contract_status( int $contract_id, string $status ) {
		return wp_update_post(
			[
				'ID'          => $contract_id,
				'post_status' => $status,
			]
		);
	}

	/**
	 * 取得合約 meta 值
	 *
	 * @param int    $contract_id 合約 ID
	 * @param string $meta_key    meta key
	 * @return mixed
	 */
	protected function get_contract_meta( int $contract_id, string $meta_key ): mixed {
		return get_post_meta( $contract_id, $meta_key, true );
	}

	// ========== 斷言 Helper ==========

	/**
	 * 斷言操作成功（$this->lastError 應為 null）
	 */
	protected function assert_operation_succeeded(): void {
		$this->assertNull(
			$this->lastError,
			sprintf( '預期操作成功，但發生錯誤：%s', $this->lastError?->getMessage() )
		);
	}

	/**
	 * 斷言操作失敗（$this->lastError 不應為 null）
	 */
	protected function assert_operation_failed(): void {
		$this->assertNotNull( $this->lastError, '預期操作失敗，但沒有發生錯誤' );
	}

	/**
	 * 斷言操作失敗且錯誤訊息包含指定文字
	 *
	 * @param string $msg 期望錯誤訊息包含的文字
	 */
	protected function assert_operation_failed_with_message( string $msg ): void {
		$this->assertNotNull( $this->lastError, '預期操作失敗' );
		$this->assertStringContainsString(
			$msg,
			$this->lastError->getMessage(),
			"錯誤訊息不包含 \"{$msg}\"，實際訊息：{$this->lastError->getMessage()}"
		);
	}

	/**
	 * 斷言 action hook 被觸發
	 *
	 * @param string $action_name action 名稱
	 */
	protected function assert_action_fired( string $action_name ): void {
		$this->assertGreaterThan(
			0,
			did_action( $action_name ),
			"Action '{$action_name}' 未被觸發"
		);
	}

	/**
	 * 斷言合約狀態符合預期
	 *
	 * @param int    $contract_id    合約 ID
	 * @param string $expected_status 期望狀態
	 */
	protected function assert_contract_status( int $contract_id, string $expected_status ): void {
		$actual_status = get_post_status( $contract_id );
		$this->assertSame(
			$expected_status,
			$actual_status,
			"合約 {$contract_id} 狀態不符，期望 {$expected_status}，實際為 {$actual_status}"
		);
	}

	/**
	 * 斷言合約 meta 欄位符合預期
	 *
	 * @param int    $contract_id 合約 ID
	 * @param string $meta_key    meta key
	 * @param mixed  $expected    期望值
	 */
	protected function assert_contract_meta( int $contract_id, string $meta_key, mixed $expected ): void {
		$actual = $this->get_contract_meta( $contract_id, $meta_key );
		$this->assertSame(
			(string) $expected,
			(string) $actual,
			"合約 meta '{$meta_key}' 不符，期望 {$expected}，實際為 {$actual}"
		);
	}
}
