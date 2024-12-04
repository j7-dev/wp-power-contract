<?php
/**
 * Bootstrap
 */

declare (strict_types = 1);

namespace J7\PowerContract;

if ( class_exists( 'J7\PowerContract\Bootstrap' ) ) {
	return;
}
/**
 * Class Bootstrap
 */
final class Bootstrap {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * Constructor
	 */
	public function __construct() {
		Resources\ContractTemplate\Init::instance();
		Resources\Contract\Init::instance();
		Resources\Contract\Ajax::instance();
		Resources\Contract\LifeCycle::instance();
		Shortcodes\Shortcodes::instance();
		Admin\Settings::instance();
		Email\Email::instance();
		if (class_exists('WooCommerce')) {
			// Woocommerce\FrontEnd\Checkout::instance();
			Woocommerce\FrontEnd\MyAccount::instance();
			Woocommerce\Admin\Orders::instance();
		}
		\add_action( 'init', [ __CLASS__, 'register_assets' ], 99 );
		\add_action( 'admin_enqueue_scripts', [ __CLASS__, 'admin_enqueue_script_list_view' ], 99 );
		\add_action( 'admin_enqueue_scripts', [ __CLASS__, 'admin_enqueue_script_edit_view' ], 100 );
		\add_action( 'wp_enqueue_scripts', [ __CLASS__, 'frontend_enqueue_script' ], 99 );
	}

	/**
	 * Register assets
	 *
	 * @return void
	 */
	public static function register_assets(): void {
		\wp_register_style(
			Plugin::$kebab,
			Plugin::$url . '/js/dist/assets/css/index.css',
			[],
			Plugin::$version
		);
	}

	/**
	 * Admin Enqueue script
	 * You can load the script on demand
	 *
	 * @param string $hook current page hook
	 *
	 * @return void
	 */
	public static function admin_enqueue_script_list_view( $hook ): void {
		if ( 'edit.php' !== $hook ) {
			return;
		}

		if ( ! \in_array( $_GET['post_type'] ?? '', [ Resources\Contract\Init::POST_TYPE, Resources\ContractTemplate\Init::POST_TYPE ], true ) ) { // phpcs:ignore
			return;
		}

		\wp_enqueue_style(Plugin::$kebab);
	}

	/**
	 * Admin Enqueue script
	 * You can load the script on demand
	 *
	 * @param string $hook current page hook
	 *
	 * @return void
	 */
	public static function admin_enqueue_script_edit_view( $hook ): void {
		if ( ! \in_array( $hook, [ 'post.php', 'post-new.php' ], true ) ) {
			return;
		}
		$post_id = $_GET['post'] ?? ''; // phpcs:ignore

		$post_type = $post_id ? \get_post_type( $post_id ) : ( $_GET['post_type'] ); // phpcs:ignore
		if ( ! \in_array( $post_type, [ Resources\Contract\Init::POST_TYPE, Resources\ContractTemplate\Init::POST_TYPE ], true ) ) {
			return;
		}

		\wp_enqueue_style(Plugin::$kebab);

		\wp_enqueue_script(
			Plugin::$kebab,
			Plugin::$url . '/inc/assets/js/admin.js',
			[ 'jquery' ],
			Plugin::$version,
			[
				'in-footer' => true,
				'strategy'  => 'async',
			]
		);
	}


	/**
	 * Front-end Enqueue script
	 * You can load the script on demand
	 *
	 * @return void
	 */
	public static function frontend_enqueue_script(): void {
		global $post;
		$post_type = $post?->post_type;
		if ( $post_type !== Resources\ContractTemplate\Init::POST_TYPE ) {
			return;
		}

		self::enqueue_script();
	}

	/**
	 * Enqueue script
	 * You can load the script on demand
	 *
	 * @return void
	 */
	public static function enqueue_script(): void {
		\wp_enqueue_style(Plugin::$kebab);

		// 自訂 js
		\wp_enqueue_script(
			Plugin::$kebab,
			Plugin::$url . '/js/dist/index.js',
			[ 'jquery' ],
			Plugin::$version,
			[
				'in-footer' => true,
				'strategy'  => 'async',
			]
		);

		$plugin_instance = Plugin::instance();
		$plugin_instance->add_module_handle( Plugin::$kebab, 'async' );

		\wp_localize_script(
			Plugin::$kebab,
			'signature_pad_custom_data',
			[
				'env' => [
					'ajaxUrl' => \untrailingslashit( \admin_url( 'admin-ajax.php' ) ),
					'nonce'   => \wp_create_nonce( Plugin::$kebab ),
				],
			]
		);
	}
}
