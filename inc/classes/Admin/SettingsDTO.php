<?php
/**
 * SettingsDTO
 */

declare(strict_types=1);

namespace J7\PowerContract\Admin;

use J7\WpUtils\Classes\DTO;

if (class_exists('J7\PowerContract\Admin\SettingsDTO')) {
	return;
}
/**
 * Class SettingsDTO
 */
final class SettingsDTO extends DTO {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * @var string
	 * 填完合約 Modal 標題
	 */
	public $ajax_signed_title;

	/**
	 * @var string
	 * 填完合約 Modal 描述
	 */
	public $ajax_signed_description;

	/**
	 * @var string
	 * 填完合約 Modal 按鈕文字，空的話會隱藏
	 */
	public $ajax_signed_btn_text;

	/**
	 * @var string
	 * 填完合約 Modal 按鈕連結
	 */
	public $ajax_signed_btn_link;

	/**
	 * @var bool
	 * 是否自動顯示訂單資訊
	 */
	public $display_order_info = false;

	/**
	 * @var bool
	 * 是否在結帳前顯示合約
	 */
	public $display_contract_before_checkout = false;

	/**
	 * @var bool
	 * 是否在結帳後、感謝頁面前顯示合約
	 */
	public $display_contract_after_checkout = false;

	/**
	 * @var array<string>
	 * 合約簽署後要寄出的 email 地址
	 */
	public $emails = [ '' ];

	/**
	 * 取得已經從 wp_option 取得資料後的實例
	 *
	 * @return self
	 */
	public static function get_instance(): self {
		$setting_array = \get_option(Settings::SETTINGS_KEY, []);
		if (!\is_array($setting_array)) {
			$setting_array = [];
		}
		return self::instance($setting_array);
	}

	/**
	 * 取得 input name 表單用
	 *
	 * @param string $key 欄位名稱
	 * @return string 欄位名稱
	 */
	public static function get_field_name( string $key ): string {
		return Settings::SETTINGS_KEY . "[$key]";
	}
}
