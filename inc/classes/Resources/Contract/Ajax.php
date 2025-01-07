<?php
/**
 * Ajax
 */

declare(strict_types=1);

namespace J7\PowerContract\Resources\Contract;

use J7\PowerContract\Plugin;
use J7\WpUtils\Classes\WP;
use J7\WpUtils\Classes\General;

if (class_exists('J7\PowerContract\Resources\Contract\Ajax')) {
	return;
}
/**
 * Class Ajax
 */
final class Ajax {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_action( 'wp_ajax_create_contract', [ __CLASS__, 'create_contract' ] );
		\add_action( 'wp_ajax_nopriv_create_contract', [ __CLASS__, 'create_contract' ] );
	}

	/**
	 * Create Contract
	 */
	public static function create_contract() {
		// 驗證 nonce
		if ( !\check_ajax_referer( Plugin::$kebab, 'nonce' ) ) {
			\wp_send_json_error(
				[
					'title'       => 'OOPS! 合約簽屬中發生錯誤!',
					'description' => 'nonce 錯誤或過期，請重新整理頁面',
				]
				);
		}

		// sanitize $_POST
		unset( $_POST['nonce'] );
		unset( $_POST['action'] );
		$post_data               = WP::sanitize_text_field_deep( $_POST, false, [ 'screenshot', 'signature' ] );
		$post_data['client_ip']  = General::get_client_ip();
		$include_required_params = WP::include_required_params( $post_data, [ 'contract_template_id' ] );
		if ( true !== $include_required_params ) {
			\wp_send_json_error(
				[
					'code'    => 'sign_error',
					'message' => $include_required_params->get_error_message(),
				]
			);
		}

		$user_id   = \get_current_user_id();
		$user_name = $post_data['user_name'] ?? '未填寫姓名';

		$img_info = WP::upload_single_base64_image( $post_data['screenshot'], 'contract', true );
		unset( $post_data['screenshot'] );

		[
			'data' => $data,
			'meta_data' => $meta_data
		] = WP::separator($post_data, 'post');

		$contract_template_name      = \get_the_title( $meta_data['contract_template_id'] );
		$meta_data['screenshot_url'] = $img_info['url'];

		$data['meta_input'] = $meta_data;
		// phpcs:disable
		$default_args       = [
			'post_type'   => Init::POST_TYPE,
			'post_status' => 'pending',
			'post_title'  => sprintf(
			/*html*/'%1$s 合約 - %2$s %3$s',
			$contract_template_name,
			$user_name,
			$user_id ? "對應 user_id: #{$user_id}" : ''
			),
			'post_author' => $user_id,
			'meta_input'  => [
				'_blog_id' => $_POST['_blog_id'],// 子站 id
			],
		];
		// phpcs:enable

		$args = \wp_parse_args( $data, $default_args );

		// insert data
		$new_contract_id = \wp_insert_post( $args );

		\do_action( 'power_contract_contract_created', $new_contract_id, $args );

		$order_id     = ( (int) $args['meta_input']['_order_id'] ) ?? null;
		$redirect     = $args['meta_input']['_redirect'] ?? null;
		$redirect_url = self::get_redirect_url($order_id, $redirect);

		\wp_send_json_success(
			[
				'code'         => 'sign_success',
				'message'      => '',
				'redirect_url' => \apply_filters('power_contract_contract_created_redirect_url', $redirect_url, $new_contract_id, $order_id),
			]
			);
	}


	/**
	 * Get redirect url
	 *
	 * @param int|null    $order_id 訂單 ID
	 * @param string|null $redirect redirect
	 * @return string
	 */
	public static function get_redirect_url( ?int $order_id, ?string $redirect ): string {
		$order = $order_id ? \wc_get_order( $order_id ) : null;
		if ($order ) {
			$order->update_meta_data( 'is_signed', 'yes' );
			$order->save();
		}

		$redirect_url = match ( $redirect) {
			'checkout' => \add_query_arg(
				[
					'is_signed' => 'yes',
				],
				\wc_get_checkout_url()
				),
			'thankyou' => $order ? \add_query_arg(
				[
					'is_signed' => 'yes',
				],
				$order->get_checkout_order_received_url()
				) : '',
			default => '',
		};

		return $redirect_url;
	}
}
