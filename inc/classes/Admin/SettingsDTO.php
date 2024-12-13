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

	/**
	 * @var self
	 * 實例
	 */
	private static $instance = null;

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
	 * @var string
	 * 選擇的合約模板 id
	 */
	public $chosen_contract_template = '';

	/**
	 * Constructor.
	 *
	 * @param array<string, string> $input Input values.
	 */
	public function __construct( array $input = [] ) {
		parent::__construct($input);
		self::$instance = $this;
	}

	/**
	 * Get the singleton instance
	 *
	 * @return self
	 */
	public static function instance() { // phpcs:ignore
		$setting_array = \get_option(Settings::SETTINGS_KEY, []);
		if (!\is_array($setting_array)) {
			$setting_array = [];
		}

		if ( null === self::$instance ) {
			new self($setting_array);
		}
		return self::$instance;
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
