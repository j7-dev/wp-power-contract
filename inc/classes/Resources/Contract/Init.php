<?php
/**
 * Custom Post Type: Contract
 */

declare(strict_types=1);

namespace J7\PowerContract\Resources\Contract;

use J7\PowerContract\Plugin;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplate;



if (class_exists('J7\PowerContract\Resources\Contract')) {
	return;
}
/**
 * Class Init
 */
final class Init {
	use \J7\WpUtils\Traits\SingletonTrait;

	const POST_TYPE = 'contract';

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_action( 'init', [ __CLASS__, 'register_cpt' ] );
		\add_action( 'load-post.php', [ __CLASS__, 'init_metabox' ] );
		\add_filter('manage_' . self::POST_TYPE . '_posts_columns', [ $this, 'add_status_column' ]);
		\add_action('manage_' . self::POST_TYPE . '_posts_custom_column', [ $this, 'render_column' ], 10, 2);
		\add_action('admin_menu', [ $this, 'remove_submitdiv_metabox' ]);
		\add_filter('bulk_actions-edit-' . self::POST_TYPE, [ $this, 'add_bulk_actions' ]);
		\add_filter('handle_bulk_actions-edit-' . self::POST_TYPE, [ $this, 'handle_bulk_actions' ], 10, 3);
		\add_action('admin_notices', [ $this, 'display_bulk_action_notices' ]);
	}

	/**
	 * Register power-contract-template custom post type
	 */
	public static function register_cpt(): void {
		$labels = [
			'name'                     => \esc_html__( 'Contract', 'power_contract' ),
			'singular_name'            => \esc_html__( 'Contract', 'power_contract' ),
			'add_new'                  => \esc_html__( 'Add new', 'power_contract' ),
			'add_new_item'             => \esc_html__( 'Add new', 'power_contract' ),
			'edit_item'                => \esc_html__( 'Edit', 'power_contract' ),
			'new_item'                 => \esc_html__( 'New', 'power_contract' ),
			'view_item'                => \esc_html__( 'View', 'power_contract' ),
			'view_items'               => \esc_html__( 'View', 'power_contract' ),
			'search_items'             => \esc_html__( 'Search Contract', 'power_contract' ),
			'not_found'                => \esc_html__( 'Not Found', 'power_contract' ),
			'not_found_in_trash'       => \esc_html__( 'Not found in trash', 'power_contract' ),
			'parent_item_colon'        => \esc_html__( 'Parent item', 'power_contract' ),
			'all_items'                => \esc_html__( 'All Contracts', 'power_contract' ),
			'archives'                 => \esc_html__( 'Contract archives', 'power_contract' ),
			'attributes'               => \esc_html__( 'Contract attributes', 'power_contract' ),
			'insert_into_item'         => \esc_html__( 'Insert to this Contract', 'power_contract' ),
			'uploaded_to_this_item'    => \esc_html__( 'Uploaded to this Contract', 'power_contract' ),
			'featured_image'           => \esc_html__( 'Featured image', 'power_contract' ),
			'set_featured_image'       => \esc_html__( 'Set featured image', 'power_contract' ),
			'remove_featured_image'    => \esc_html__( 'Remove featured image', 'power_contract' ),
			'use_featured_image'       => \esc_html__( 'Use featured image', 'power_contract' ),
			'menu_name'                => \esc_html__( 'Contract', 'power_contract' ),
			'filter_items_list'        => \esc_html__( 'Filter Contract list', 'power_contract' ),
			'filter_by_date'           => \esc_html__( 'Filter by date', 'power_contract' ),
			'items_list_navigation'    => \esc_html__( 'Contract list navigation', 'power_contract' ),
			'items_list'               => \esc_html__( 'Contract list', 'power_contract' ),
			'item_published'           => \esc_html__( 'Contract published', 'power_contract' ),
			'item_published_privately' => \esc_html__( 'Contract published privately', 'power_contract' ),
			'item_reverted_to_draft'   => \esc_html__( 'Contract reverted to draft', 'power_contract' ),
			'item_scheduled'           => \esc_html__( 'Contract scheduled', 'power_contract' ),
			'item_updated'             => \esc_html__( 'Contract updated', 'power_contract' ),
		];

		// 註冊自訂狀態
		\register_post_status(
			'approved',
			[
				'label'                     => _x('Approved', 'post status'),
				'public'                    => true,
				'exclude_from_search'       => false,
				'show_in_admin_all_list'    => true,
				'show_in_admin_status_list' => true,
				'label_count'               => _n_noop('Approved <span class="count">(%s)</span>', 'Approved <span class="count">(%s)</span>'),
			]
			);

		$args = [
			'label'                 => \esc_html__( 'Contract', 'power_contract' ),
			'labels'                => $labels,
			'description'           => '',
			'public'                => true,
			'hierarchical'          => false,
			'exclude_from_search'   => false,
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
			'show_in_menu'          => 'edit.php?post_type=' . ContractTemplate::POST_TYPE,
			'capability_type'       => 'post',
			'supports'              => [ 'title', 'author', 'thumbnail' ],
			'map_meta_cap'          => true,
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
		\add_action( 'add_meta_boxes', [ __CLASS__, 'add_metabox' ] );
	}

	/**
	 * Adds the meta box.
	 *
	 * @param string $post_type Post type.
	 */
	public static function add_metabox( string $post_type ): void {
		if ( in_array( $post_type, [ self::POST_TYPE ], true ) ) {
			\add_meta_box(
				self::POST_TYPE . '-metabox',
				__( 'Contract', 'power_contract' ),
				[ __CLASS__, 'render_meta_box' ],
				$post_type,
				'advanced',
				'high'
			);
		}
	}

	/**
	 * Render meta box.
	 */
	public static function render_meta_box(): void {
		$post_meta = \get_post_meta( \get_the_ID() );
		echo '<table>';
		foreach ($post_meta as $key => $value) {
			if (in_array($key, [ '_edit_lock', '_thumbnail_id' ], true)) {
				continue;
			}
			$content = $value[0];
			if (\str_starts_with($content, 'data:image')) {
				$content = sprintf(
				/*html*/'
				<a href="%1$s" target="_blank"><img src="%1$s" alt="%2$s" style="%3$s" /></a>
				',
				$content,
				$key,
				'width: 10rem;border: 1px solid #ccc;'
				);
			}

			printf(
			/*html*/'
			<tr>
				<td style="vertical-align: top;border-bottom: 1px solid #ccc;padding: 0.5rem 0.5rem;">%1$s</td>
				<td style="vertical-align: top;border-bottom: 1px solid #ccc;padding: 0.5rem 0.5rem;">%2$s</td>
			</tr>
			',
			$key,
			$content
			);
		}

		// featured image url
		$featured_image_url = \get_the_post_thumbnail_url( \get_the_ID(), 'full' );
		printf(
		/*html*/'
		<tr>
			<td style="vertical-align: top;border-bottom: 1px solid #ccc;padding: 0.5rem 0.5rem;">簽屬合約</td>
			<td style="vertical-align: top;border-bottom: 1px solid #ccc;padding: 0.5rem 0.5rem;">
				%1$s
			</td>
		</tr>
		',
		$featured_image_url ? sprintf(
		/*html*/'<a href="%1$s" target="_blank"><img src="%1$s" style="%2$s" /></a>',
		$featured_image_url,
		'width: 10rem;border: 1px solid #ccc;'
		) : ''
		);
		echo '</table>';
	}

	/**
	 * 新增 status 欄位
	 *
	 * @param array $columns 欄位
	 * @return array
	 */
	public function add_status_column( array $columns ): array {
		// status 放在 title 後面
		$columns = \array_slice($columns, 0, 2) + [
			'user_name' => __('name', 'power_contract'),
			'status'    => __('Status', 'power_contract'),
		] + \array_slice($columns, 2);
		return $columns;
	}

	/**
	 * 渲染 status 欄位內容
	 *
	 * @param string $column 欄位
	 * @param int    $post_id 文章 ID
	 * @return void
	 */
	public function render_column( string $column, int $post_id ): void {
		if ('status' === $column) {
			$post_status = \get_post_status($post_id);

			$class = match ($post_status) {
				'pending' => 'bg-[#f8dda7] text-[#573b00]',
				'approved' => 'bg-[#c8d7e1] text-[#003d66]',
				default => 'bg-[#f8dda7] text-[#573b00]',
			};

			printf(
			/*html*/'<mark class="%1$s px-2" style="%2$s"><span>%3$s</span></mark>',
			$class,
			'display: inline-flex;line-height: 2.5em;border-radius: 4px;border-bottom: 1px solid rgba(0,0,0,.05);margin: -.25em 0;cursor: inherit !important;white-space: nowrap;max-width: 100%;text-decoration: none;word-wrap: break-word;font-size: 13px;',
			$post_status,
			);
		}

		if ('user_name' === $column) {
			$user_name = \get_post_meta($post_id, 'user_name', true);
			echo $user_name;
		}
	}

	/**
	 * 移除 submitdiv metabox
	 *
	 * @return void
	 */
	public function remove_submitdiv_metabox(): void {
		\remove_meta_box('submitdiv', self::POST_TYPE, 'side');
	}

	/**
	 * 新增自訂 bulk actions
	 *
	 * @param array $bulk_actions 自訂 bulk actions
	 * @return array
	 */
	public function add_bulk_actions( array $bulk_actions ): array {
		$bulk_actions['change-to-pending']  = __('Change to Pending', 'power_contract');
		$bulk_actions['change-to-approved'] = __('Change to Approved', 'power_contract');
		return $bulk_actions;
	}

	/**
	 * 處理自訂 bulk actions
	 *
	 * @param string $redirect_url 重定向 URL
	 * @param string $action 動作
	 * @param array  $post_ids 文章 ID 陣列
	 * @return string
	 */
	public function handle_bulk_actions( string $redirect_url, string $action, array $post_ids ): string {
		if ('change-to-pending' === $action) {
			foreach ($post_ids as $post_id) {
				\wp_update_post(
					[
						'ID'          => $post_id,
						'post_status' => 'pending',
					]
					);
			}
			$redirect_url = \add_query_arg('changed-to-pending', \count($post_ids), $redirect_url);
		}

		if ('change-to-approved' === $action) {
			foreach ($post_ids as $post_id) {
				\wp_update_post(
					[
						'ID'          => $post_id,
						'post_status' => 'approved',
					]
					);
			}
			$redirect_url = \add_query_arg('changed-to-approved', \count($post_ids), $redirect_url);
		}

		return $redirect_url;
	}

	/**
	 * 顯示 bulk action 完成的提示訊息
	 *
	 * @return void
	 */
	public function display_bulk_action_notices(): void {
		if (!empty($_REQUEST['changed-to-pending'])) {
			$count = (int) $_REQUEST['changed-to-pending'];
			printf('<div id="message" class="updated notice is-dismissable"><p>' . _n('%d contract changed to Pending.', '%d contracts changed to Pending.', $count, 'power_contract') . '</p></div>', $count);
		}

		if (!empty($_REQUEST['changed-to-approved'])) {
			$count = (int) $_REQUEST['changed-to-approved'];
			printf('<div id="message" class="updated notice is-dismissable"><p>' . _n('%d contract changed to Approved.', '%d contracts changed to Approved.', $count, 'power_contract') . '</p></div>', $count);
		}
	}
}