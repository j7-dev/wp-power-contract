<?php
/**
 * Settings
 */

declare(strict_types=1);

namespace J7\PowerContract\Admin;

use J7\PowerContract\Plugin;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplate;

if (class_exists('J7\PowerContract\Admin\Settings')) {
	return;
}
/**
 * Class Settings
 */
final class Settings {
	use \J7\WpUtils\Traits\SingletonTrait;

	const MENU_SLUG    = 'contract_template_settings';
	const SETTINGS_KEY = 'power_contract_settings';

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_action('admin_menu', [ __CLASS__, 'add_submenu_page' ]);
		\add_action('admin_init', [ __CLASS__, 'register_settings' ]);
		\add_action('admin_enqueue_scripts', [ __CLASS__, 'admin_enqueue_script' ]);
	}

	/**
	 * Add submenu page
	 */
	public static function add_submenu_page(): void {
		\add_submenu_page(
			'edit.php?post_type=' . ContractTemplate::POST_TYPE,
			__('Settings', 'power_contract'),
			__('Settings', 'power_contract'),
			'manage_options',
			self::MENU_SLUG,
			[ __CLASS__, 'render_page' ]
		);
	}

	/**
	 * Register settings
	 */
	public static function register_settings(): void {
		\register_setting(self::SETTINGS_KEY, self::SETTINGS_KEY);
	}

	/**
	 * Render settings page
	 */
	public static function render_page(): void {
		Plugin::safe_get('settings');
	}


	/**
	 * Enqueue script
	 *
	 * @param string $hook Hook name
	 * @return void
	 */
	public static function admin_enqueue_script( string $hook ): void {
		if ('contract_template_page_' . self::MENU_SLUG !== $hook) {
			return;
		}

		// tailwind
		\wp_enqueue_style( Plugin::$kebab );

		// CDN shoelace
		\wp_register_style( 'shoelace', 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.18.0/cdn/themes/light.css', [], '2.18.0' );
		\wp_register_script( 'shoelace', 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.18.0/cdn/shoelace-autoloader.js', [], '2.18.0', false );

		\wp_enqueue_style( 'shoelace' );
		\wp_enqueue_script( 'shoelace' );

		if (\method_exists(Plugin::class, 'add_module_handle')) {
			Plugin::instance()->add_module_handle('shoelace', '');
		}

		\wp_enqueue_style(Plugin::$kebab);
	}
}
