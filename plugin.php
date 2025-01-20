<?php
/**
 * Plugin Name:       Power Contract | 學吧版本
 * Plugin URI:        https://github.com/j7-dev/wp-power-contract
 * Description:       WordPress 線上簽合約 & 審批 外掛
 * Version:           0.0.11
 * Requires at least: 5.7
 * Requires PHP:      8.0
 * Author:            J7
 * Author URI:        https://github.com/j7-dev
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       power_contract
 * Domain Path:       /languages
 * Tags:              contract, signature, approval
 */

declare ( strict_types=1 );

namespace J7\PowerContract;

if ( \class_exists( 'J7\PowerContract\Plugin' ) ) {
	return;
}

require_once __DIR__ . '/vendor/autoload.php';

/**
 * Class Plugin
 */
final class Plugin {
	use \J7\WpUtils\Traits\PluginTrait;
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * Constructor
	 */
	public function __construct() {
		// if your plugin depends on other plugins, you can add them here
		$this->required_plugins = [
			// [
			// 'name'     => 'Powerhouse',
			// 'slug'     => 'powerhouse',
			// 'source'   => 'https://github.com/j7-dev/wp-powerhouse/releases/latest/download/powerhouse.zip',
			// 'version'  => '2.0.6',
			// 'required' => true,
			// ],
		];

		$this->init(
		[
			'app_name'     => 'Power Contract',
			'github_repo'  => 'https://github.com/j7-dev/wp-power-contract',
			'callback'     => [ Bootstrap::class, 'instance' ],
			'lc'           => false,
			'hide_submenu' => true,
		]
		);

		self::$template_page_names = [ 'settings' ];
	}
}

Plugin::instance();
