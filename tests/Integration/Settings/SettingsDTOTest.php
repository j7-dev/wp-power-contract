<?php
/**
 * SettingsDTO 整合測試
 * 驗證設定值的讀取、預設值與型別轉換
 *
 * @group settings
 */

declare( strict_types=1 );

namespace Tests\Integration\Settings;

use Tests\Integration\TestCase;
use J7\PowerContract\Admin\Settings;
use J7\PowerContract\Admin\SettingsDTO;

/**
 * Class SettingsDTOTest
 * 測試 Power Contract 設定 DTO 的行為
 */
class SettingsDTOTest extends TestCase {

	/**
	 * 初始化依賴
	 */
	protected function configure_dependencies(): void {
		// 確保每次測試前清除設定快取
		delete_option( Settings::SETTINGS_KEY );
	}

	/**
	 * 清理（每個測試後）
	 */
	public function tear_down(): void {
		delete_option( Settings::SETTINGS_KEY );
		parent::tear_down();
	}

	// ========== 冒煙測試（Smoke Tests）==========

	/**
	 * @test
	 * @group smoke
	 * SettingsDTO 可正常實例化
	 */
	public function test_SettingsDTO可正常實例化(): void {
		// 重置單例
		$reflection = new \ReflectionClass( SettingsDTO::class );
		$property   = $reflection->getProperty( 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );

		$dto = SettingsDTO::instance();
		$this->assertInstanceOf( SettingsDTO::class, $dto );
	}

	// ========== 快樂路徑（Happy Flow）==========

	/**
	 * @test
	 * @group happy
	 * 設定選項不存在時 DTO 使用預設值
	 */
	public function test_無設定選項時使用預設值(): void {
		// 確保選項不存在
		delete_option( Settings::SETTINGS_KEY );

		// 重置單例
		$reflection = new \ReflectionClass( SettingsDTO::class );
		$property   = $reflection->getProperty( 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );

		$dto = SettingsDTO::instance();

		$this->assertSame( '', $dto->ajax_signed_title, 'ajax_signed_title 預設應為空字串' );
		$this->assertSame( '', $dto->ajax_signed_description, 'ajax_signed_description 預設應為空字串' );
		$this->assertSame( '', $dto->ajax_signed_btn_text, 'ajax_signed_btn_text 預設應為空字串' );
		$this->assertSame( '', $dto->ajax_signed_btn_link, 'ajax_signed_btn_link 預設應為空字串' );
		$this->assertFalse( $dto->display_order_info, 'display_order_info 預設應為 false' );
		$this->assertFalse( $dto->display_contract_before_checkout, 'display_contract_before_checkout 預設應為 false' );
		$this->assertFalse( $dto->display_contract_after_checkout, 'display_contract_after_checkout 預設應為 false' );
		$this->assertSame( '', $dto->chosen_contract_template, 'chosen_contract_template 預設應為空字串' );
	}

	/**
	 * @test
	 * @group happy
	 * 儲存設定後 DTO 可正確讀取
	 */
	public function test_儲存設定後DTO可正確讀取(): void {
		$settings = [
			'ajax_signed_title'       => '合約簽署成功！',
			'ajax_signed_description' => '您已成功簽署本合約',
			'ajax_signed_btn_text'    => '前往查看',
			'ajax_signed_btn_link'    => 'https://example.com/contracts',
		];

		update_option( Settings::SETTINGS_KEY, $settings );

		// 重置單例以重新讀取
		$reflection = new \ReflectionClass( SettingsDTO::class );
		$property   = $reflection->getProperty( 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );

		$dto = SettingsDTO::instance();

		$this->assertSame( '合約簽署成功！', $dto->ajax_signed_title );
		$this->assertSame( '您已成功簽署本合約', $dto->ajax_signed_description );
		$this->assertSame( '前往查看', $dto->ajax_signed_btn_text );
		$this->assertSame( 'https://example.com/contracts', $dto->ajax_signed_btn_link );
	}

	/**
	 * @test
	 * @group happy
	 * get_field_name 方法應回傳正確的表單欄位名稱
	 */
	public function test_get_field_name回傳正確欄位名稱(): void {
		$field_name = SettingsDTO::get_field_name( 'ajax_signed_title' );
		$this->assertSame(
			Settings::SETTINGS_KEY . '[ajax_signed_title]',
			$field_name
		);
	}

	/**
	 * @test
	 * @group happy
	 * emails 欄位預設應為包含空字串的陣列
	 */
	public function test_emails欄位預設值(): void {
		delete_option( Settings::SETTINGS_KEY );

		$reflection = new \ReflectionClass( SettingsDTO::class );
		$property   = $reflection->getProperty( 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );

		$dto = SettingsDTO::instance();

		$this->assertIsArray( $dto->emails );
	}

	/**
	 * @test
	 * @group happy
	 * 儲存多組 email 通知地址
	 */
	public function test_儲存多組email通知地址(): void {
		$emails = [ 'admin@example.com', 'manager@example.com', 'ceo@example.com' ];

		update_option(
			Settings::SETTINGS_KEY,
			[ 'emails' => $emails ]
		);

		$reflection = new \ReflectionClass( SettingsDTO::class );
		$property   = $reflection->getProperty( 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );

		$dto = SettingsDTO::instance();

		$this->assertCount( 3, $dto->emails );
		$this->assertContains( 'admin@example.com', $dto->emails );
		$this->assertContains( 'manager@example.com', $dto->emails );
	}

	// ========== 錯誤處理（Error Handling）==========

	/**
	 * @test
	 * @group error
	 * 設定選項為非陣列時應使用預設值（不 crash）
	 */
	public function test_設定選項為非陣列時使用預設值(): void {
		// 存入非陣列值
		update_option( Settings::SETTINGS_KEY, 'invalid_string_value' );

		$reflection = new \ReflectionClass( SettingsDTO::class );
		$property   = $reflection->getProperty( 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );

		// 不應 crash
		$dto = SettingsDTO::instance();
		$this->assertInstanceOf( SettingsDTO::class, $dto );
	}

	/**
	 * @test
	 * @group error
	 * 設定選項含有未知欄位時應被忽略
	 */
	public function test_設定選項含未知欄位時被忽略(): void {
		update_option(
			Settings::SETTINGS_KEY,
			[
				'ajax_signed_title' => '正常標題',
				'unknown_field_xyz' => '不存在的欄位',
			]
		);

		$reflection = new \ReflectionClass( SettingsDTO::class );
		$property   = $reflection->getProperty( 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );

		$dto = SettingsDTO::instance();

		$this->assertSame( '正常標題', $dto->ajax_signed_title );
		$this->assertFalse( property_exists( $dto, 'unknown_field_xyz' ) );
	}

	// ========== 邊緣案例（Edge Cases）==========

	/**
	 * @test
	 * @group edge
	 * 設定標題含有 Unicode 字元應正確儲存與讀取
	 */
	public function test_設定標題含Unicode字元正確讀取(): void {
		$unicode_title = '🎉 合約簽署成功 ✅ テスト العربية';
		update_option(
			Settings::SETTINGS_KEY,
			[ 'ajax_signed_title' => $unicode_title ]
		);

		$reflection = new \ReflectionClass( SettingsDTO::class );
		$property   = $reflection->getProperty( 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );

		$dto = SettingsDTO::instance();
		$this->assertSame( $unicode_title, $dto->ajax_signed_title );
	}

	/**
	 * @test
	 * @group edge
	 * 設定按鈕連結為空字串時應正常運作
	 */
	public function test_設定按鈕連結為空字串(): void {
		update_option(
			Settings::SETTINGS_KEY,
			[ 'ajax_signed_btn_link' => '' ]
		);

		$reflection = new \ReflectionClass( SettingsDTO::class );
		$property   = $reflection->getProperty( 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );

		$dto = SettingsDTO::instance();
		$this->assertSame( '', $dto->ajax_signed_btn_link );
	}

	/**
	 * @test
	 * @group edge
	 * chosen_contract_template 設定模板 ID
	 */
	public function test_設定預設合約模板(): void {
		$template_id = $this->create_contract_template(
			[ 'post_title' => '預設模板' ]
		);

		update_option(
			Settings::SETTINGS_KEY,
			[ 'chosen_contract_template' => (string) $template_id ]
		);

		$reflection = new \ReflectionClass( SettingsDTO::class );
		$property   = $reflection->getProperty( 'instance' );
		$property->setAccessible( true );
		$property->setValue( null, null );

		$dto = SettingsDTO::instance();
		$this->assertSame( (string) $template_id, $dto->chosen_contract_template );
	}
}
