<?php
/**
 * Checkout
 * TODO
 */

declare(strict_types=1);

namespace J7\PowerContract\Woocommerce\FrontEnd;

use J7\PowerContract\Plugin;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplate;

if (class_exists('J7\PowerContract\Woocommerce\FrontEnd\Checkout')) {
	return;
}
/**
 * Class Checkout
 */
final class Checkout {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * Constructor
	 */
	public function __construct() {

		\add_filter('template_redirect', [ __CLASS__, 'redirect_before_checkout' ], 10, );
		\add_filter('woocommerce_get_checkout_order_received_url', [ __CLASS__, 'redirect_before_thankyou' ], 10, 2);
	}

	public static function redirect_before_checkout() {
		if (!is_checkout()) {
			return;
		}
		// 重導向到自訂表單頁面
		\wp_redirect(\site_url('contract_template/ooo'));
		exit;
	}

	public static function redirect_before_thankyou( $url, $order ) {
		return get_site_url() . '/your-form-page';
	}
}
