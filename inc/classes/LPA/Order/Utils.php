<?php
/**
 * Utils
 */

declare (strict_types = 1);

namespace J7\PowerContract\LPA\Order;

use J7\PowerContract\LPA\Product\Edit;

if (class_exists('J7\PowerContract\LPA\Order\Utils')) {
	return;
}
/**
 * Class Utils
 */
abstract class Utils {

	/**
	 * 判斷訂單是否包含訂金商品
	 *
	 * @param \WC_Order $order 訂單
	 * @return bool 是否包含訂金商品
	 */
	public static function include_deposit( \WC_Order $order ): bool {

		$items           = $order->get_items();
		$include_deposit = false;
		foreach ($items as $item) {
			/** @var \WC_Order_Item_Product $item */
			$product_id = $item->get_product_id();
			// 判斷是否為訂金商品(包含訂金分類)
			$product_cats = \get_the_terms( $product_id, 'product_cat' );
			foreach ( $product_cats as $product_cat ) {
				if ( 'deposit' === $product_cat->slug ) {
					$include_deposit = true;
					break;
				}
			}

			// 只要有訂金商品，就中斷
			if ($include_deposit) {
				break;
			}
		}

		return $include_deposit;
	}

	/**
	 * 判斷訂單是否包含需要簽約的商品
	 *
	 * @param \WC_Order $order 訂單
	 * @return bool 是否包含需要簽約的商品
	 */
	public static function include_need_contract_product( \WC_Order $order ): bool {
		$items                         = $order->get_items();
		$include_need_contract_product = false;
		foreach ($items as $item) {
			/** @var \WC_Order_Item_Product $item */
			$product_id = $item->get_product_id();
			// 判斷是否為訂金商品(包含訂金分類)
			$need_contract = \get_post_meta( $product_id, Edit::NEED_CONTRACT_META_KEY, true ) === 'yes';
			if ($need_contract) {
				$include_need_contract_product = true;
				break;
			}
		}

		return $include_need_contract_product;
	}
}
