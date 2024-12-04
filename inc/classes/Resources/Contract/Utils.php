<?php
/**
 * Utils
 */

declare(strict_types=1);

namespace J7\PowerContract\Resources\Contract;

if (class_exists('J7\PowerContract\Resources\Contract\Utils')) {
	return;
}
/**
 * Class Utils
 */
abstract class Utils {

	/**
	 * 取得訂單的合約
	 *
	 * @param int    $order_id 訂單 ID
	 * @param array|null $args 額外參數
	 * @return \WP_Post[]|int[]
	 */
	public static function get_contracts_by_order_id( int $order_id, ?array $args = null ) {
		$default_args = [
			'post_type'      => Init::POST_TYPE,
			'post_status'    => 'any',
			'posts_per_page' => -1,
			'meta_key'       => '_order_id',
			'meta_value'     => $order_id,
		];

		$args = \wp_parse_args( $args, $default_args );

		$contracts = \get_posts( $args );

		return $contracts;
	}
}
