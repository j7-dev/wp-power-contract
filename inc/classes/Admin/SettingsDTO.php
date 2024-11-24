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
}
