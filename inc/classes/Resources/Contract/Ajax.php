<?php
/**
 * Ajax
 */

declare(strict_types=1);

namespace J7\PowerContract\Resources\Contract;

use J7\PowerContract\Plugin;
use J7\WpUtils\Classes\WP;
use J7\WpUtils\Classes\General;



if (class_exists('J7\PowerContract\Resources\Contract')) {
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
					'title'       => 'OOPS! 合約簽屬中發生錯誤!',
					'description' => $include_required_params->get_error_message(),
				]
			);
		}

		$user_id   = \get_current_user_id();
		$user_name = $post_data['user_name'] ?? '未填寫姓名';

		$attachment_id = WP::upload_base64_image_to_media( $post_data['screenshot'], 'contract' );
		unset( $post_data['screenshot'] );

		[
			'data' => $data,
			'meta_data' => $meta_data
		] = WP::separator($post_data, 'post');

		$contract_template_name = \get_the_title( $meta_data['contract_template_id'] );

		$data['meta_input'] = $meta_data;
		$default_args       = [
			'post_type'     => Init::POST_TYPE,
			'post_status'   => 'pending',
			'post_title'    => sprintf(
			/*html*/'%1$s 合約 - %2$s %3$s',
			$contract_template_name,
			$user_name,
			$user_id ? "對應 user_id: #{$user_id}" : ''
			),
			'post_author'   => $user_id,
			'_thumbnail_id' => $attachment_id,
		];

		$args = \wp_parse_args( $data, $default_args );

		// insert data
		\wp_insert_post( $args );

		\wp_send_json_success(
			[
				'title'       => '已收到您的合約簽屬，等待審閱!',
				'description' => '審閱大約需要 3~5 個工作天，請耐心等候',
			]
			);
	}
}
