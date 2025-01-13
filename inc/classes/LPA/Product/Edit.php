<?php
/**
 * Edit
 */

declare(strict_types=1);

namespace J7\PowerContract\LPA\Product;

if (class_exists('J7\PowerContract\LPA\Product\Edit')) {
	return;
}
/**
 * Class Edit
 */
final class Edit {
	use \J7\WpUtils\Traits\SingletonTrait;

	const NEED_CONTRACT_META_KEY = '_need_contract';

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_filter('product_type_options', [ $this, 'add_contract_product_option' ]);
		\add_action( 'save_post_product', [ __CLASS__, 'save_product_type_options' ], 10, 3 );
	}

	/**
	 * 新增產品簽約選項
	 *
	 * @param array<string, array{id: string, wrapper_class: string, label: string, description: string, default: string}> $options 現有的產品選項
	 * @return array<string, array{id: string, wrapper_class: string, label: string, description: string, default: string}> 修改後的產品選項
	 */
	public function add_contract_product_option( array $options ): array {

		$options[ self::NEED_CONTRACT_META_KEY ] = [
			'id'            => self::NEED_CONTRACT_META_KEY,
			'wrapper_class' => 'show_if_simple show_if_variable',
			'label'         => __('需要簽約', 'power-contract'),
			'description'   => __('啟用此選項表示此產品需要簽約', 'power-contract'),
			'default'       => 'no',
		];

		return $options;
	}

	/**
	 * 儲存產品簽約選項
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post    Post object.
	 * @param bool     $update  Whether this is an existing post being updated.
	 */
	public static function save_product_type_options( int $post_id, \WP_Post $post, bool $update ): void {
		// 如果是自動儲存，不處理
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		// 確認使用者權限
		if ( ! current_user_can( 'edit_product', $post_id ) ) {
			return;
		}

		// 儲存簽約選項
		$need_contract = isset( $_POST['_need_contract'] ) ? 'yes' : 'no'; // phpcs:ignore
		\update_post_meta( $post_id, '_need_contract', \sanitize_text_field( $need_contract ) );
	}
}
