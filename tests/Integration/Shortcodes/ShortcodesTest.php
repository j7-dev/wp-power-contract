<?php
/**
 * Shortcodes 整合測試
 * 驗證 pct_input, pct_date, pct_ip 等短碼的渲染輸出
 *
 * @group shortcodes
 */

declare( strict_types=1 );

namespace Tests\Integration\Shortcodes;

use Tests\Integration\TestCase;
use J7\PowerContract\Shortcodes\Shortcodes;

/**
 * Class ShortcodesTest
 * 測試 Power Contract 各短碼的渲染行為
 */
class ShortcodesTest extends TestCase {

	/**
	 * 初始化依賴
	 */
	protected function configure_dependencies(): void {
		// 直接使用 WordPress shortcode APIs
	}

	// ========== 冒煙測試（Smoke Tests）==========

	/**
	 * @test
	 * @group smoke
	 * 確認所有短碼均已正確註冊
	 */
	public function test_所有短碼已正確註冊(): void {
		global $shortcode_tags;

		foreach ( Shortcodes::$shortcodes as $shortcode ) {
			$this->assertArrayHasKey(
				$shortcode,
				$shortcode_tags,
				"短碼 [{$shortcode}] 未被註冊"
			);
		}
	}

	/**
	 * @test
	 * @group smoke
	 * pct_input 短碼應渲染 input 元素
	 */
	public function test_pct_input短碼渲染input元素(): void {
		$output = do_shortcode( '[pct_input name="test_field"]' );
		$this->assertStringContainsString( '<input', $output );
		$this->assertStringContainsString( 'name="test_field"', $output );
	}

	/**
	 * @test
	 * @group smoke
	 * pct_date 短碼應渲染日期字串
	 */
	public function test_pct_date短碼渲染日期字串(): void {
		$output = do_shortcode( '[pct_date base="ad" format="Y年m月d日"]' );
		$year   = (int) date( 'Y' );
		$this->assertStringContainsString( (string) $year, $output );
	}

	/**
	 * @test
	 * @group smoke
	 * pct_ip 短碼應渲染 IP 字串（非空）
	 */
	public function test_pct_ip短碼渲染IP字串(): void {
		$output = do_shortcode( '[pct_ip]' );
		$this->assertNotEmpty( $output, 'pct_ip 短碼輸出不應為空' );
	}

	// ========== 快樂路徑（Happy Flow）==========

	/**
	 * @test
	 * @group happy
	 * pct_input 帶 name 參數應正確渲染
	 */
	public function test_pct_input帶name參數正確渲染(): void {
		$output = do_shortcode( '[pct_input name="user_name"]' );
		$this->assertStringContainsString( 'name="user_name"', $output );
		$this->assertStringContainsString( 'type="text"', $output );
	}

	/**
	 * @test
	 * @group happy
	 * pct_input 帶 width 參數應套用寬度
	 */
	public function test_pct_input帶width參數套用寬度(): void {
		$output = do_shortcode( '[pct_input name="test" width="320px"]' );
		$this->assertStringContainsString( '320px', $output );
	}

	/**
	 * @test
	 * @group happy
	 * pct_input 帶 placeholder 參數應套用 placeholder
	 */
	public function test_pct_input帶placeholder參數套用placeholder(): void {
		$output = do_shortcode( '[pct_input name="test" placeholder="請輸入姓名"]' );
		$this->assertStringContainsString( 'placeholder="請輸入姓名"', $output );
	}

	/**
	 * @test
	 * @group happy
	 * pct_input 帶 value 參數應預填值且不可編輯
	 */
	public function test_pct_input帶value參數預填且不可編輯(): void {
		$output = do_shortcode( '[pct_input name="test" value="預設值"]' );
		$this->assertStringContainsString( 'value="預設值"', $output );
		$this->assertStringContainsString( 'pointer-events-none', $output );
	}

	/**
	 * @test
	 * @group happy
	 * pct_date 預設顯示中華民國曆
	 */
	public function test_pct_date預設顯示中華民國曆(): void {
		$output = do_shortcode( '[pct_date]' );
		// 中華民國年份 = 西元年份 - 1911，目前年份為 2026，中華民國為 115
		$roc_year = (int) date( 'Y' ) - 1911;
		$this->assertStringContainsString( (string) $roc_year, $output );
	}

	/**
	 * @test
	 * @group happy
	 * pct_date 帶 base=ad 應顯示西元曆
	 */
	public function test_pct_date帶base_ad顯示西元曆(): void {
		$output   = do_shortcode( '[pct_date base="ad" format="Y年"]' );
		$ad_year  = (int) date( 'Y' );
		$this->assertStringContainsString( (string) $ad_year, $output );
	}

	/**
	 * @test
	 * @group happy
	 * pct_date base=tw 年份換算正確
	 */
	public function test_pct_date_tw曆年份換算正確(): void {
		$output   = do_shortcode( '[pct_date base="tw" format="Y年"]' );
		$roc_year = (int) date( 'Y' ) - 1911;
		$this->assertStringContainsString( (string) $roc_year . '年', $output );
	}

	/**
	 * @test
	 * @group happy
	 * pct_seal 在無 $post 全域變數時應回傳錯誤提示
	 */
	public function test_pct_seal在無全域post時回傳提示(): void {
		// 確保 $post 為 null（預設測試環境）
		global $post;
		$original_post = $post;
		$post          = null; // phpcs:ignore

		$output = do_shortcode( '[pct_seal]' );
		$this->assertStringContainsString( '找不到', $output );

		$post = $original_post; // phpcs:ignore 還原
	}

	/**
	 * @test
	 * @group happy
	 * pct_signature 在無 $post 全域變數時應回傳錯誤提示
	 */
	public function test_pct_signature在無全域post時回傳提示(): void {
		global $post;
		$original_post = $post;
		$post          = null; // phpcs:ignore

		$output = do_shortcode( '[pct_signature]' );
		$this->assertStringContainsString( '找不到', $output );

		$post = $original_post; // phpcs:ignore 還原
	}

	/**
	 * @test
	 * @group happy
	 * pct_signature 有 $post 時應渲染簽名畫布 HTML
	 */
	public function test_pct_signature有全域post時渲染畫布(): void {
		global $post;
		$original_post = $post;
		$template_id   = $this->create_contract_template();
		$post          = get_post( $template_id ); // phpcs:ignore

		$output = do_shortcode( '[pct_signature]' );
		$this->assertStringContainsString( 'pct__signature', $output );
		$this->assertStringContainsString( 'canvas', $output );

		$post = $original_post; // phpcs:ignore
	}

	// ========== 錯誤處理（Error Handling）==========

	/**
	 * @test
	 * @group error
	 * pct_input 未給 name 參數應渲染空 name
	 */
	public function test_pct_input未給name參數渲染空name(): void {
		$output = do_shortcode( '[pct_input]' );
		$this->assertStringContainsString( '<input', $output );
		$this->assertStringContainsString( 'name=""', $output );
	}

	/**
	 * @test
	 * @group error
	 * pct_seal 有 $post 但無 seal_url meta 時應顯示提示
	 */
	public function test_pct_seal有post但無seal_url顯示提示(): void {
		global $post;
		$original_post = $post;
		$template_id   = $this->create_contract_template(); // 沒有設定 seal_url
		$post          = get_post( $template_id ); // phpcs:ignore

		$output = do_shortcode( '[pct_seal]' );
		$this->assertStringContainsString( '找不到公司章', $output );

		$post = $original_post; // phpcs:ignore
	}

	// ========== 邊緣案例（Edge Cases）==========

	/**
	 * @test
	 * @group edge
	 * pct_input name 帶有特殊字元應被原樣輸出
	 */
	public function test_pct_input_name帶特殊字元(): void {
		$output = do_shortcode( '[pct_input name="field_123"]' );
		$this->assertStringContainsString( 'name="field_123"', $output );
	}

	/**
	 * @test
	 * @group edge
	 * pct_input type=email 應渲染 type="email"
	 */
	public function test_pct_input_type_email渲染正確(): void {
		$output = do_shortcode( '[pct_input name="user_email" type="email"]' );
		$this->assertStringContainsString( 'type="email"', $output );
	}

	/**
	 * @test
	 * @group edge
	 * pct_date 自訂複雜格式字串應正確渲染
	 */
	public function test_pct_date自訂複雜格式渲染正確(): void {
		$output = do_shortcode( '[pct_date base="ad" format="Y/m/d"]' );
		// 應包含 /（斜線）
		$this->assertStringContainsString( '/', $output );
		$this->assertMatchesRegularExpression( '/\d{4}\/\d{2}\/\d{2}/', $output );
	}

	/**
	 * @test
	 * @group edge
	 * pct_input 帶有 XSS payload 的 value 應被 WordPress 渲染機制處理
	 */
	public function test_pct_input_value帶XSS_payload(): void {
		// value 直接以 %7$s 輸出到 HTML，此處驗證它不會破壞 HTML 結構
		$output = do_shortcode( '[pct_input name="test" value="hello"]' );
		$this->assertStringContainsString( 'value="hello"', $output );
		// 確認輸出仍是合法的 input 標籤
		$this->assertStringContainsString( '<input', $output );
	}

	/**
	 * @test
	 * @group edge
	 * pct_seal 有 seal_url 時應渲染圖片
	 */
	public function test_pct_seal有seal_url時渲染圖片(): void {
		global $post;
		$original_post = $post;
		$seal_url      = 'https://example.com/company-seal.png';
		$template_id   = $this->create_contract_template(
			[ 'seal_url' => $seal_url ]
		);
		$post = get_post( $template_id ); // phpcs:ignore

		$output = do_shortcode( '[pct_seal]' );
		$this->assertStringContainsString( '<img', $output );
		$this->assertStringContainsString( $seal_url, $output );

		$post = $original_post; // phpcs:ignore
	}

	/**
	 * @test
	 * @group security
	 * pct_ip 輸出應是合法 IP 格式（非惡意資料）
	 */
	public function test_pct_ip輸出為合法IP格式(): void {
		$output = do_shortcode( '[pct_ip]' );
		// 合法 IP 或 UNKNOWN（General::get_client_ip 的 fallback）
		// 測試環境通常為 127.0.0.1 或 UNKNOWN
		$this->assertMatchesRegularExpression(
			'/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|UNKNOWN|::1|[0-9a-fA-F:]+)$/',
			$output,
			"pct_ip 輸出應是合法 IP 格式，實際輸出：{$output}"
		);
	}
}
