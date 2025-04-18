<?php
/**
 * Checkout
 * 結帳前後重新導向頁面
 */

declare(strict_types=1);

namespace J7\PowerContract\Woocommerce\FrontEnd;

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
	 * 原來的結帳完成頁面
	 *
	 * @var string
	 */
	private static $origin_thankyou_url;

	/**
	 * Constructor
	 */
	public function __construct() {

		\add_action('template_redirect', [ __CLASS__, 'redirect_before_checkout' ], 10 );
		\add_filter('woocommerce_get_checkout_order_received_url', [ __CLASS__, 'redirect_before_thankyou' ], 10, 2);

		\add_filter('power_contract_redirect_before_checkout_condition', [ __CLASS__, 'redirect_before_checkout_base_condition' ]);

		\add_filter('power_contract_redirect_before_thankyou_condition', [ __CLASS__, 'redirect_before_thankyou_base_condition' ], 10, 2);
	}

	/**
	 * 結帳前重導頁面
	 */
	public static function redirect_before_checkout(): void {
		$custom_condition = \apply_filters(
			'power_contract_redirect_before_checkout_condition',
			true
			);
		if (!$custom_condition) {
			return;
		}

		$settings_dto             = SettingsDTO::instance();
		$chosen_contract_template = \apply_filters(
			'power_contract_chosen_contract_template',
			$settings_dto->chosen_contract_template
			);

		// 重導向資料紀錄在 url
		$url = \add_query_arg(
				[
					'redirect' => 'checkout',
				],
				\site_url("contract_template/{$chosen_contract_template}")
				);

		// 重導向到合約頁面
		\wp_safe_redirect($url);
		exit;
	}

	/**
	 * 結帳後重導頁面
	 *
	 * @param string    $url 重導頁面URL
	 * @param \WC_Order $order 訂單
	 *
	 * @return string
	 */
	public static function redirect_before_thankyou( $url, $order ): string {

		$custom_condition = \apply_filters(
			'power_contract_redirect_before_thankyou_condition',
			true,
			$order
			);
		if (!$custom_condition) {
			return $url;
		}

		$settings_dto = SettingsDTO::instance();

		$chosen_contract_template = \apply_filters(
			'power_contract_chosen_contract_template',
			$settings_dto->chosen_contract_template
			);

		if (!$chosen_contract_template) {
			return $url;
		}

		self::$origin_thankyou_url = $url;

		// 重導向資料紀錄在 url
		$url = \add_query_arg(
				[
					'redirect' => 'thankyou',
					'order_id' => $order->get_id(),
				],
				\get_permalink($chosen_contract_template)
				);

		// 重導向到合約頁面
		return $url;
	}

	/**
	 * 結帳前重導頁面條件
	 *
	 * @param bool $custom_condition 能不能重導
	 *
	 * @return bool
	 */
	public static function redirect_before_checkout_base_condition( $custom_condition ): bool {

		if (!$custom_condition) {
			return false;
		}

		if (!\is_checkout()) {
			return false;
		}

		$is_signed = ( $_GET['is_signed'] ?? 'no' ) === 'yes'; // phpcs:ignore
		if ($is_signed) {
			return false;
		}

		$settings_dto = SettingsDTO::instance();
		if (!$settings_dto->display_contract_before_checkout) {
			return false;
		}

		return $custom_condition;
	}

	/**
	 * 結帳後重導頁面條件
	 *
	 * @param bool      $custom_condition 能不能重導
	 * @param \WC_Order $order 訂單
	 *
	 * @return bool
	 */
	public static function redirect_before_thankyou_base_condition( $custom_condition, $order ): bool {
		if (!$custom_condition) {
			return false;
		}

		$settings_dto = SettingsDTO::instance();
		if (!$settings_dto->display_contract_after_checkout) {
			return false;
		}
		$is_signed = $order->get_meta('is_signed') === 'yes';

		if ($is_signed) {
			return false;
		}

		return $custom_condition;
	}
}
