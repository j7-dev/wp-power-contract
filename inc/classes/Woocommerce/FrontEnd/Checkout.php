<?php
/**
 * Checkout
 * 結帳前後重新導向頁面
 */

declare(strict_types=1);

namespace J7\PowerContract\Woocommerce\FrontEnd;

use J7\PowerContract\Plugin;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplate;
use J7\PowerContract\Admin\SettingsDTO;

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

	/**
	 * 結帳前重導頁面
	 */
	public static function redirect_before_checkout(): void {
		if (!\is_checkout()) {
			return;
		}

		$settings_dto = SettingsDTO::instance();
		if (!$settings_dto->display_contract_before_checkout) {
			return;
		}

		$custom_condition = \apply_filters(
			'power_contract_custom_redirect_before_checkout_condition',
			true
			);
		if (!$custom_condition) {
			return;
		}

		$chosen_contract_template = \apply_filters(
			'power_contract_chosen_contract_template',
			$settings_dto->chosen_contract_template
			);

		// 重導向到自訂表單頁面
		\wp_redirect(\site_url("contract_template/{$chosen_contract_template}"));
		exit;
	}

	public static function redirect_before_thankyou( $url, $order ) {
		$settings_dto = SettingsDTO::instance();
		if (!$settings_dto->display_contract_after_checkout) {
			return $url;
		}
		return get_site_url() . '/your-form-page';
	}
}
