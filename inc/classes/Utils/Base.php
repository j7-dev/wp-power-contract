<?php
/**
 * Base
 */

declare (strict_types = 1);

namespace J7\PowerContract\Utils;

if (class_exists('J7\PowerContract\Utils\Base')) {
	return;
}
/**
 * Class Base
 */
abstract class Base {
	const BASE_URL      = '/';
	const APP1_SELECTOR = '#power_contract';
	const APP2_SELECTOR = '#power_contract_metabox';
	const API_TIMEOUT   = '30000';
	const DEFAULT_IMAGE = 'http://1.gravatar.com/avatar/1c39955b5fe5ae1bf51a77642f052848?s=96&d=mm&r=g';

	/**
	 * I18n 字串翻譯
	 *
	 * @param string $key 翻譯的 key
	 * @return string
	 */
	public static function i18n( string $key ): string {
		return match ( $key ) {
			'contract_template_id' => __('Contract Template Id', 'power_contract'),
			'signature' =>  __('Signature', 'power_contract'),
			'user_name' =>  __('User Name', 'power_contract'),
			'contract_amount' =>  __('Contract Amount', 'power_contract'),
			'user_address' =>  __('User Address', 'power_contract'),
			'user_identity' =>  __('User Identity', 'power_contract'),
			'user_phone' =>  __('User Phone', 'power_contract'),
			'signed_contract' =>  __('Signed Contract', 'power_contract'),
			'signed_at' =>  __('Signed At', 'power_contract'),
			'screenshot_url' =>  __('Signed Contract', 'power_contract'),
			default => $key,
		};
	}

	/**
	 * 取得用戶的完整地址
	 *
	 * @param int    $user_id 用戶 ID
	 * @param string $type 地址類型 billing 或 shipping
	 * @return string 用戶的完整地址
	 */
	public static function get_full_address( $user_id, $type = 'billing' ) {

		$fields = [
			"_{$type}_postcode",
			"_{$type}_state",
			"_{$type}_city",
			"_{$type}_address_1",
			"_{$type}_address_2",
		];

		$full_address = '';
		foreach ($fields as $field) {
			$full_address .= \get_user_meta($user_id, $field, true);
		}

		// 如果 user meta 有值，就 return full address
		if ($full_address) {
			return $full_address;
		}

		// 如果 order_id 有值，就從 order 取得 full address
		$order_id = $_GET['order_id'] ?? null; // phpcs:ignore
		if (!$order_id) {
			return $full_address;
		}

		$order = \wc_get_order($order_id);
		if (!$order) {
			return $full_address;
		}

		$methods = array_map(fn( $field ) => "get{$field}", $fields);

		$full_address = '';
		foreach ($methods as $method) {
			if (\method_exists($order, $method)) {
				$full_address .= $order->{$method}();
			}
		}

		return $full_address;
	}

	/**
	 * 是否啟用 WooCommerce
	 *
	 * @return bool
	 */
	public static function wc_enabled(): bool {
		return class_exists('WooCommerce', false);
	}
}
