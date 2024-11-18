<?php
/**
 * Plugin Name:       Power Contract
 * Plugin URI:        https://github.com/j7-dev/wp-power-contract
 * Description:       WordPress 線上簽合約 & 審批 外掛
 * Version:           0.0.1
 * Requires at least: 5.7
 * Requires PHP:      8.0
 * Author:            Your Name
 * Author URI:        https://github.com/j7-dev
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       power_contract
 * Domain Path:       /languages
 * Tags: your tags
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
		// $this->required_plugins = [
		// [
		// 'name'     => 'WooCommerce',
		// 'slug'     => 'woocommerce',
		// 'required' => true,
		// 'version'  => '7.6.0',
		// ],
		// [
		// 'name'     => 'Powerhouse',
		// 'slug'     => 'powerhouse',
		// 'source'   => '[YOUR GITHUB URL]/wp-powerhouse/releases/latest/download/powerhouse.zip',
		// 'version'  => '1.0.14',
		// 'required' => true,
		// ],
		// ];

		$this->init(
			[
				'app_name'    => 'Power Contract',
				'github_repo' => 'https://github.com/j7-dev/wp-power-contract',
				'callback'    => [ Bootstrap::class, 'instance' ],
				'lc'           => 'skip',
				'hide_submenu' => true,
			]
		);
	}
}

Plugin::instance();
