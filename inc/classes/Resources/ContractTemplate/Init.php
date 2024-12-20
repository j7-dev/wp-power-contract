<?php
/**
 * Custom Post Type: Contract Template
 */

declare(strict_types=1);

namespace J7\PowerContract\Resources\ContractTemplate;

use J7\PowerContract\Plugin;
use J7\PowerContract\Shortcodes\Shortcodes;
use J7\WpUtils\Classes\WP;

if (class_exists('J7\PowerContract\Resources\ContractTemplate\Init')) {
	return;
}
/**
 * Class Init
 */
final class Init {
	use \J7\WpUtils\Traits\SingletonTrait;

	const POST_TYPE = 'contract_template';

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_action( 'init', [ __CLASS__, 'register_cpt' ] );
		\add_action( 'load-post.php', [ __CLASS__, 'init_metabox' ] );
		\add_action( 'load-post-new.php', [ __CLASS__, 'init_metabox' ] );
		\add_filter( 'template_include', [ __CLASS__, 'load_custom_template' ], 90 );
		\add_action( 'save_post_' . self::POST_TYPE, [ __CLASS__, 'save_metabox' ], 10, 2 );
		\add_action( 'rest_insert_' . self::POST_TYPE, [ __CLASS__, 'save_block_editor_metabox' ], 10, 2 );
		\add_action( 'post_edit_form_tag', [ __CLASS__, 'update_edit_form' ] );
	}

	/**
	 * Register power-contract-template custom post type
	 */
	public static function register_cpt(): void {
		$labels = [
			'name'                     => \esc_html__( 'Contract Template', 'power_contract' ),
			'singular_name'            => \esc_html__( 'Contract Template', 'power_contract' ),
			'add_new'                  => \esc_html__( 'Add new', 'power_contract' ),
			'add_new_item'             => \esc_html__( 'Add new', 'power_contract' ),
			'edit_item'                => \esc_html__( 'Edit', 'power_contract' ),
			'new_item'                 => \esc_html__( 'New', 'power_contract' ),
			'view_item'                => \esc_html__( 'View', 'power_contract' ),
			'view_items'               => \esc_html__( 'View', 'power_contract' ),
			'search_items'             => \esc_html__( 'Search Contract Template', 'power_contract' ),
			'not_found'                => \esc_html__( 'Not Found', 'power_contract' ),
			'not_found_in_trash'       => \esc_html__( 'Not found in trash', 'power_contract' ),
			'parent_item_colon'        => \esc_html__( 'Parent item', 'power_contract' ),
			'all_items'                => \esc_html__( 'All Contract Templates', 'power_contract' ),
			'archives'                 => \esc_html__( 'Contract Template archives', 'power_contract' ),
			'attributes'               => \esc_html__( 'Contract Template attributes', 'power_contract' ),
			'insert_into_item'         => \esc_html__( 'Insert to this Contract Template', 'power_contract' ),
			'uploaded_to_this_item'    => \esc_html__( 'Uploaded to this Contract Template', 'power_contract' ),
			'featured_image'           => \esc_html__( 'Featured image', 'power_contract' ),
			'set_featured_image'       => \esc_html__( 'Set featured image', 'power_contract' ),
			'remove_featured_image'    => \esc_html__( 'Remove featured image', 'power_contract' ),
			'use_featured_image'       => \esc_html__( 'Use featured image', 'power_contract' ),
			'menu_name'                => \esc_html__( 'Contract Template', 'power_contract' ),
			'filter_items_list'        => \esc_html__( 'Filter Contract Template list', 'power_contract' ),
			'filter_by_date'           => \esc_html__( 'Filter by date', 'power_contract' ),
			'items_list_navigation'    => \esc_html__( 'Contract Template list navigation', 'power_contract' ),
			'items_list'               => \esc_html__( 'Contract Template list', 'power_contract' ),
			'item_published'           => \esc_html__( 'Contract Template published', 'power_contract' ),
			'item_published_privately' => \esc_html__( 'Contract Template published privately', 'power_contract' ),
			'item_reverted_to_draft'   => \esc_html__( 'Contract Template reverted to draft', 'power_contract' ),
			'item_scheduled'           => \esc_html__( 'Contract Template scheduled', 'power_contract' ),
			'item_updated'             => \esc_html__( 'Contract Template updated', 'power_contract' ),
		];
		$args   = [
			'label'                 => \esc_html__( 'Contract Template', 'power_contract' ),
			'labels'                => $labels,
			'description'           => '',
			'public'                => true,
			'hierarchical'          => false,
			'exclude_from_search'   => true,
			'publicly_queryable'    => true,
			'show_ui'               => true,
			'show_in_nav_menus'     => false,
			'show_in_admin_bar'     => false,
			'show_in_rest'          => true,
			'query_var'             => false,
			'can_export'            => true,
			'delete_with_user'      => true,
			'has_archive'           => false,
			'rest_base'             => '',
			'show_in_menu'          => true,
			'menu_position'         => 6,
			'menu_icon'             => 'dashicons-media-document',
			'capability_type'       => 'post',
			'supports'              => [ 'title', 'editor' ],
			'taxonomies'            => [],
			'rest_controller_class' => 'WP_REST_Posts_Controller',
			'rewrite'               => [
				'with_front' => true,
			],
		];

		\register_post_type( self::POST_TYPE, $args );
	}


	/**
	 * Meta box initialization.
	 */
	public static function init_metabox(): void {
		\add_action( 'add_meta_boxes', [ __CLASS__, 'add_metaboxes' ] );
	}

	/**
	 * Adds the meta boxes.
	 *
	 * @param string $post_type Post type.
	 */
	public static function add_metaboxes( string $post_type ): void {
		if ( in_array( $post_type, [ self::POST_TYPE ], true ) ) {
			\add_meta_box(
				self::POST_TYPE . '-metabox',
				__( 'Available Fields', 'power_contract' ),
				[ __CLASS__, 'render_meta_box' ],
				$post_type,
				'advanced',
				'high'
			);
			\add_meta_box(
				self::POST_TYPE . '-image-metabox',
				__( 'Seal Image', 'power_contract' ),
				[ __CLASS__, 'render_image_meta_box' ],
				$post_type,
				'side',
				'default'
			);
		}
	}

	/**
	 * Render meta box.
	 */
	public static function render_meta_box(): void {

		echo '<table class="w-full">';
		foreach ( Shortcodes::$shortcode_examples as $key => $example ) {
			printf(
				/*html*/'
				<tr class="hover:bg-gray-100 py-2 copy-shortcode cursor-pointer">
					<td>%1$s</td>
					<td class="shortcode">
						<div class="flex items-center">
							<kbd class="pc-kbd pc-tooltip gap-2" data-tip="點擊複製">
								%2$s
							</kbd>
							<span class="ml-2 check-icon"></span>
						</div>
					</td>
					<td>%3$s</td>
				</tr>
				',
				$example['label'],
				$example['shortcode'],
				$example['description']
			);
		}
		echo '</table>';
	}

	/**
	 * Render image meta box.
	 *
	 * @param \WP_Post $post Post object.
	 */
	public static function render_image_meta_box( \WP_Post $post ): void {
		$seal_url = \get_post_meta( $post->ID, 'seal_url', true );

		printf(
		/*html*/'
			<p style="overflow: hidden;">
				<input type="file" name="seal" value="" size="25" />
				<input type="hidden" name="seal_nonce" value="%1$s" />
			</p>
		',
		\wp_create_nonce(self::POST_TYPE)
		);

		if ($seal_url) {
			printf(
			/*html*/'<img src="%1$s" style="max-width: 100%%; margin-top: 10px;" />',
			\esc_url($seal_url)
			);
		}
	}

	/**
	 * Save meta box data.
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post Post object.
	 */
	public static function save_metabox( int $post_id, \WP_Post $post ): void {
		if ( ! isset( $_POST['seal_nonce'] ) || ! \wp_verify_nonce( $_POST['seal_nonce'], self::POST_TYPE ) ) { // phpcs:ignore
			return;
		}

		if ( ! \current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		if ( isset( $_FILES['seal'] ) && $_FILES['seal']['error'] === UPLOAD_ERR_OK ) { //phpcs:ignore
			$uploaded_files = WP::upload_files( $_FILES['seal'], true ); //phpcs:ignore

			if ( ! \is_wp_error( $uploaded_files ) && isset( $uploaded_files[0]['url'] ) ) {
				\update_post_meta( $post_id, 'seal_url', $uploaded_files[0]['url'] );
			}
		}
	}

	/**
	 * 儲存區塊編輯器的自訂欄位資料
	 *
	 * @param \WP_Post         $post     已儲存的文章物件
	 * @param \WP_REST_Request $request  請求物件
	 */
	public static function save_block_editor_metabox( \WP_Post $post, \WP_REST_Request $request ): void {
		$params = $request->get_params();

		if ( isset( $params['meta']['seal_url'] ) ) {
			\update_post_meta( $post->ID, 'seal_url', $params['meta']['seal_url'] );
		}
	}

	/**
	 * Load custom template
	 * Set {Plugin::$kebab}/{slug}/report  php template
	 *
	 * @param string|null $template Template.
	 */
	public static function load_custom_template( $template ) {
		if (!\is_singular(self::POST_TYPE)) {
			return $template;
		}
		// 獲取當前文章
		$post      = \get_queried_object();
		$post_type = self::POST_TYPE;
		// 正確的模板優先順序
		$possible_theme_templates = [
			\get_stylesheet_directory() . "/single-{$post_type}-{$post?->post_name}.php",
			\get_stylesheet_directory() . "/single-{$post_type}.php",
		];

		// 檢查主題是否有對應的模板文件
		foreach ($possible_theme_templates as $theme_template) {
			if (file_exists($theme_template)) {
				return $theme_template;
			}
		}
		return Plugin::$dir . '/inc/templates/single-contract_template.php';
	}

	/**
	 * Update edit form tag
	 */
	public static function update_edit_form(): void {
		echo ' enctype="multipart/form-data"';
	}
}
