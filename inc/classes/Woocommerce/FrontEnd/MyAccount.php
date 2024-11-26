<?php
/**
 * MyAccount 訂單要顯示關聯合約
 */

declare(strict_types=1);

namespace J7\PowerContract\Woocommerce\FrontEnd;

use J7\PowerContract\Resources\Contract\Init as Contract;
use J7\PowerContract\Plugin;
use J7\WpUtils\Classes\General;

if (class_exists('J7\PowerContract\Woocommerce\FrontEnd\MyAccount')) {
	return;
}
/**
 * Class MyAccount
 */
final class MyAccount {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_action('woocommerce_view_order', [ __CLASS__, 'display_contract_in_myaccount_order' ], 10, 1);
		\add_action( 'wp_enqueue_scripts', [ __CLASS__, 'enqueue_style' ], 99 );
	}

	/**
	 * 註冊 style
	 *
	 * @return void
	 */
	public static function enqueue_style(): void {
		if (!General::in_url([ 'view-order' ])) {
			return;
		}
		\wp_enqueue_style( Plugin::$kebab );
	}

	/**
	 * 在訂單頁面顯示合約
	 *
	 * @param int $order_id 訂單 ID
	 * @return void
	 */
	public static function display_contract_in_myaccount_order( $order_id ) {

		$contracts = \get_posts(
			[
				'post_type'   => Contract::POST_TYPE,
				'numberposts' => -1,
				'post_status' => [ 'approved', 'pending', 'rejected' ],
				'meta_key'    => '_order_id',
				'meta_value'  => $order_id,
			]
			);

		if (empty($contracts)) {
			return;
		}

		echo '<section class="woocommerce-contract-details">';
		echo '<h2 class="woocommerce-column__title">合約</h2>';

		echo '<div class="flex flex-wrap gap-4">';
		foreach ($contracts as $contract) {
			$screenshot_url = \get_post_meta( $contract->ID, 'screenshot_url', true );
			$post_status    = $contract->post_status;
			$status_tag     = Contract::get_status_tag($post_status);

			printf(
			/*html*/'
			<a href="%1$s" target="_blank" class="focus:outline-none relative">
				<img src="%1$s" style="%2$s" />
				<div class="absolute top-2 right-2">%3$s</div>
			</a>',
			$screenshot_url,
			'width: 10rem;border: 1px solid #ccc;',
			$status_tag
			);
		}
		echo '</div>';
		echo '</section>';
	}
}
