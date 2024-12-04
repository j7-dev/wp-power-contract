<?php
/**
 * Orders
 */

declare(strict_types=1);

namespace J7\PowerContract\Woocommerce\Admin;

use J7\PowerContract\Resources\Contract\Utils as ContractUtils;

if (class_exists('J7\PowerContract\Woocommerce\Admin\Orders')) {
	return;
}
/**
 * Class Orders
 */
final class Orders {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * Constructor
	 */
	public function __construct() {
		// 傳統 WooCommerce 訂單列表的 hook
		add_filter('manage_edit-shop_order_columns', [ __CLASS__, 'add_contract_column' ], 100, 1);
		add_action('manage_shop_order_posts_custom_column', [ __CLASS__, 'display_contract_column' ], 10, 2);

		// HPOS 新版本 WooCommerce 訂單列表的 hook
		add_filter('woocommerce_shop_order_list_table_columns', [ __CLASS__, 'add_contract_column' ], 100, 1);
		add_action('woocommerce_shop_order_list_table_custom_column', [ __CLASS__, 'display_contract_column' ], 10, 2);
	}

	/**
	 * 新增合約欄位到訂單列表
	 *
	 * @param array $columns 訂單列表欄位
	 * @return array
	 */
	public static function add_contract_column( $columns ) {
		$new_columns = [
			'contract' => __('Contract', 'power_contract'),
		];

		return array_merge($columns, $new_columns);
	}

	/**
	 * 顯示訂單列表的合約欄位內容
	 *
	 * @param string        $column 欄位名稱
	 * @param \WC_Order|int $order_or_post_id 訂單(HPOS)或文章 ID
	 */
	public static function display_contract_column( $column, $order_or_post_id ) {
		if ($column === 'contract') {
			$order_id     = (int) ( \is_numeric( $order_or_post_id ) ? $order_or_post_id : $order_or_post_id->get_id() );
			$contract_ids = ContractUtils::get_contracts_by_order_id(
					$order_id,
				[
					'fields' => 'ids',
				] // phpcs:ignore
				);
			foreach ($contract_ids as $contract_id) {
				printf(
				/*html*/'
				<a href="%1$s" target="_blank">%2$s</a><br />
				',
					\get_edit_post_link( $contract_id ),
					"#{$contract_id}"
				);
			}
		}
	}
}
