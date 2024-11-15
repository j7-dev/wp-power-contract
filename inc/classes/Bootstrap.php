<?php
/**
 * Bootstrap
 */

declare (strict_types = 1);

namespace J7\PowerContract;

use J7\PowerContract\Utils\Base;
use Kucrut\Vite;

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

		FrontEnd\Entry::instance();
		Resources\ContractTemplate\Init::instance();
		Shortcodes\Shortcodes::instance();

		\add_action( 'admin_enqueue_scripts', [ __CLASS__, 'admin_enqueue_script' ], 99 );
		\add_action( 'wp_enqueue_scripts', [ __CLASS__, 'frontend_enqueue_script' ], 99 );
	}

	/**
	 * Admin Enqueue script
	 * You can load the script on demand
	 *
	 * @param string $hook current page hook
	 *
	 * @return void
	 */
	public static function admin_enqueue_script( $hook ): void {
		self::enqueue_script();
	}


	/**
	 * Front-end Enqueue script
	 * You can load the script on demand
	 *
	 * @return void
	 */
	public static function frontend_enqueue_script(): void {
		global $post;
		$post_type = $post->post_type;
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

		\wp_enqueue_script(
			'signature_pad',
			Plugin::$url . '/inc/assets/js/signature_pad.umd.min.js',
			[],
			'5.0.4',
			false
		);

		\wp_enqueue_script(
			'signature_pad_custom',
			Plugin::$url . '/inc/assets/js/signature_pad_custom.js',
			[ 'signature_pad', 'jquery' ],
			Plugin::$version,
			[
				'in-footer' => true,
				'strategy'  => 'async',
			]
		);

		$plugin_instance = Plugin::instance();
		$plugin_instance->add_module_handle( 'signature_pad_custom', 'async' );

		// DELETE 可能不需要REACT
		Vite\enqueue_asset(
			Plugin::$dir . '/js/dist',
			'js/src/main.tsx',
			[
				'handle'    => Plugin::$kebab,
				'in-footer' => true,
			]
		);

		$post_id = \get_the_ID();

		\wp_localize_script(
			Plugin::$kebab,
			Plugin::$snake . '_data',
			[
				'env' => [
					'siteUrl'       => \untrailingslashit( \site_url() ),
					'ajaxUrl'       => \untrailingslashit( \admin_url( 'admin-ajax.php' ) ),
					'userId'        => \get_current_user_id(),
					'postId'        => $post_id,
					'APP_NAME'      => Plugin::$app_name,
					'KEBAB'         => Plugin::$kebab,
					'SNAKE'         => Plugin::$snake,
					'BASE_URL'      => Base::BASE_URL,
					'APP1_SELECTOR' => Base::APP1_SELECTOR,
					'APP2_SELECTOR' => Base::APP2_SELECTOR,
					'API_TIMEOUT'   => Base::API_TIMEOUT,
					'nonce'         => \wp_create_nonce( Plugin::$kebab ),
				],
			]
		);

		\wp_localize_script(
			Plugin::$kebab,
			'wpApiSettings',
			[
				'root'  => \untrailingslashit( \esc_url_raw( rest_url() ) ),
				'nonce' => \wp_create_nonce( 'wp_rest' ),
			]
		);
	}
}
