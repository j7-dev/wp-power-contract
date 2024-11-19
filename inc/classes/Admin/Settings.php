<?php
/**
 * Settings
 */

declare(strict_types=1);

namespace J7\PowerContract\Admin;

use J7\PowerContract\Utils\Base;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplate;

if (class_exists('J7\PowerContract\Admin\Settings')) {
	return;
}
/**
 * Class Settings
 */
final class Settings {
	use \J7\WpUtils\Traits\SingletonTrait;

	const MENU_SLUG = 'contract_template_settings';

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_action('admin_menu', [ $this, 'add_submenu_page' ]);
		\add_action('admin_init', [ $this, 'register_settings' ]);
	}

	/**
	 * Add submenu page
	 */
	public function add_submenu_page(): void {
		\add_submenu_page(
			'edit.php?post_type=' . ContractTemplate::POST_TYPE,
			__('Settings', 'power_contract'),
			__('Settings', 'power_contract'),
			'manage_options',
			self::MENU_SLUG,
			[ $this, 'render_page' ]
		);
	}

	/**
	 * Register settings
	 */
	public function register_settings(): void {
		\register_setting(Base::SETTINGS_KEY, Base::SETTINGS_KEY);
	}

	/**
	 * Render settings page
	 */
	public function render_page(): void {
		$settings_key = Base::SETTINGS_KEY;
		$options      = Base::get_settings();

		echo '<div class="wrap">';
		echo '<h1>' . \esc_html__('Contract Template Settings', 'power_contract') . '</h1>';

		echo '<form method="post" action="options.php">';
		\settings_fields($settings_key);
		\do_settings_sections($settings_key);

		printf(
		/*html*/'
		<label class="form-control w-full max-w-xs">
			<div class="label">
				<span class="label-text">%1$s</span>
			</div>
			<input type="text" name="%2$s" value="%3$s" class="input input-bordered w-full max-w-xs" />
		</label>
		',
		__('Title', 'power_contract'),
		"{$settings_key}[ajax_signed_title]",
		$options['ajax_signed_title'] ?? '已收到您的合約簽屬，等待審閱!'
		);

		printf(
			/*html*/'
			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">%1$s</span>
				</div>
				<textarea class="textarea textarea-bordered h-24" name="%2$s">%3$s</textarea>
			</label>
			',
			__('Description', 'power_contract'),
			"{$settings_key}[ajax_signed_description]",
			$options['ajax_signed_description'] ?? '審閱完成後會立即通知您，並為您開通課程'
			);

		\submit_button();

		echo '</form>';
		echo '</div>';
	}
}
