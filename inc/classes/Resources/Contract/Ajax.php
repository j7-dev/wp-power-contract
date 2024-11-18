<?php
/**
 * Ajax
 */

declare(strict_types=1);

namespace J7\PowerContract\Resources\Contract;

use J7\PowerContract\Plugin;
use J7\WpUtils\Classes\WP;


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

		$user_id = \get_current_user_id();
		if ( !$user_id ) {
			\wp_send_json_error(
				[
					'title'       => 'OOPS! 合約簽屬中發生錯誤!',
					'description' => '請先登入',
				]
				);
		}

		$user         = \get_user_by( 'ID', $user_id );
		$display_name = $user->display_name;

		// sanitize $_POST
		unset( $_POST['nonce'] );
		unset( $_POST['action'] );
		$post_data               = WP::sanitize_text_field_deep( $_POST, false, [ 'screenshot', 'signature' ] );
		$include_required_params = WP::include_required_params( $post_data, [ 'contract_template_id' ] );
		if ( true !== $include_required_params ) {
			\wp_send_json_error(
				[
					'title'       => 'OOPS! 合約簽屬中發生錯誤!',
					'description' => $include_required_params->get_error_message(),
				]
			);
		}

		$attachment_id = self::upload_base64_image( $post_data['screenshot'] );
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
			'post_title'    => "{$contract_template_name} 合約 - {$display_name} #{$user_id}",
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



	/**
	 * Save the image on the server.
	 *
	 * @param string $base64_img Base64 encoded image.
	 * @return int Attachment ID.
	 */
	private static function upload_base64_image( string $base64_img ): int {

		// Upload dir.
		$upload_dir  = wp_upload_dir();
		$upload_path = str_replace( '/', DIRECTORY_SEPARATOR, $upload_dir['path'] ) . DIRECTORY_SEPARATOR;

		$img             = str_replace( 'data:image/jpeg;base64,', '', $base64_img );
		$img             = str_replace( ' ', '+', $img );
		$decoded         = base64_decode( $img );
		$filename        = 'contract.jpeg';
		$file_type       = 'image/jpeg';
		$hashed_filename = md5( $filename . microtime() ) . '_' . $filename;

		// Save the image in the uploads directory.
		$upload_file = file_put_contents( $upload_path . $hashed_filename, $decoded );

		$attachment = [
			'post_mime_type' => $file_type,
			'post_title'     => preg_replace( '/\.[^.]+$/', '', basename( $hashed_filename ) ),
			'post_content'   => '',
			'post_status'    => 'inherit',
			'guid'           => $upload_dir['url'] . '/' . basename( $hashed_filename ),
		];

		$attach_id = \wp_insert_attachment( $attachment, $upload_dir['path'] . '/' . $hashed_filename );

		return $attach_id;
	}
}
