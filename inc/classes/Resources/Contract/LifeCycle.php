<?php
/**
 * LifeCycle
 */

declare(strict_types=1);

namespace J7\PowerContract\Resources\Contract;

if (class_exists('J7\PowerContract\Resources\Contract\LifeCycle')) {
	return;
}
/**
 * Class LifeCycle
 */
final class LifeCycle {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_action( 'transition_post_status', [ __CLASS__, 'after_contract_pending' ], 10, 3 );
		\add_action( 'transition_post_status', [ __CLASS__, 'after_contract_approved' ], 10, 3 );
		\add_action( 'transition_post_status', [ __CLASS__, 'after_contract_rejected' ], 10, 3 );
	}

	/**
	 * 合約審核中後的處理
	 *
	 * @param string   $new_status 新狀態
	 * @param string   $old_status 舊狀態
	 * @param \WP_Post $post 合約文章物件
	 */
	public static function after_contract_pending( $new_status, $old_status, $post ): void {
		if (Init::POST_TYPE !== $post->post_type) {
			return;
		}
		if ( 'pending' !== $new_status ) {
			return;
		}

		\do_action( 'power_contract_contract_pending', $new_status, $old_status, $post );
	}

	/**
	 * 合約審核通過後的處理
	 *
	 * @param string   $new_status 新狀態
	 * @param string   $old_status 舊狀態
	 * @param \WP_Post $post 合約文章物件
	 */
	public static function after_contract_approved( $new_status, $old_status, $post ): void {
		if (Init::POST_TYPE !== $post->post_type) {
			return;
		}
		if ( 'approved' !== $new_status ) {
			return;
		}

		\do_action( 'power_contract_contract_approved', $new_status, $old_status, $post );
	}

	/**
	 * 合約審核拒絕後的處理
	 *
	 * @param string   $new_status 新狀態
	 * @param string   $old_status 舊狀態
	 * @param \WP_Post $post 合約文章物件
	 */
	public static function after_contract_rejected( $new_status, $old_status, $post ): void {
		if (Init::POST_TYPE !== $post->post_type) {
			return;
		}
		if ( 'rejected' !== $new_status ) {
			return;
		}

		\do_action( 'power_contract_contract_rejected', $new_status, $old_status, $post );
	}
}
