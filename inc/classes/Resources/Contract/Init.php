<?php
/**
 * Custom Post Type: Contract
 */

declare(strict_types=1);

namespace J7\PowerContract\Resources\Contract;

use J7\PowerContract\Utils\Base;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplate;



if (class_exists('J7\PowerContract\Resources\Contract\Init')) {
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

		\add_action( 'admin_post_reject_contract', [ __CLASS__, 'handle_reject_contract' ] );
		\add_action( 'admin_post_approve_contract', [ __CLASS__, 'handle_approve_contract' ] );
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

		\register_post_status(
				'rejected',
				[
					'label'                     => _x('Rejected', 'post status'),
					'public'                    => true,
					'exclude_from_search'       => false,
					'show_in_admin_all_list'    => true,
					'show_in_admin_status_list' => true,
					'label_count'               => _n_noop('Rejected <span class="count">(%s)</span>', 'Rejected <span class="count">(%s)</span>'),
				]
			);

		$args = [
			'label'                 => \esc_html__( 'Contract', 'power_contract' ),
			'labels'                => $labels,
			'description'           => '',
			'public'                => false,
			'hierarchical'          => false,
			'exclude_from_search'   => false,
			'publicly_queryable'    => false,
			'show_ui'               => true,
			'show_in_nav_menus'     => false,
			'show_in_admin_bar'     => false,
			'show_in_rest'          => false,
			'query_var'             => false,
			'can_export'            => true,
			'delete_with_user'      => true,
			'has_archive'           => false,
			'rest_base'             => '',
			'show_in_menu'          => 'edit.php?post_type=' . ContractTemplate::POST_TYPE,
			'capability_type'       => 'post',
			'supports'              => [ 'title' ],
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

			\add_meta_box(
				self::POST_TYPE . '-approval-metabox',
				__( 'Approval', 'power_contract' ),
				[ __CLASS__, 'render_approval_meta_box' ],
				$post_type,
				'side',
				'high'
			);
		}
	}

	/**
	 * Render meta box.
	 *
	 * @param \WP_Post $post 文章
	 */
	public static function render_meta_box( $post ): void {
		$post_id   = $post->ID;
		$post_meta = \get_post_meta( $post_id );

		$post_meta = self::post_meta_format( (int) $post_id, $post_meta );

		echo '<table>';
		foreach ($post_meta as $key => $value) {
			$content = $value[0];
			if (\str_starts_with( (string) $content, 'data:image')) {
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
		echo '</table>';
	}


	/**
	 * Render approval meta box.
	 *
	 * @param \WP_Post $post 文章
	 */
	public static function render_approval_meta_box( $post ): void {
		$post_id     = $post->ID;
		$post_status = get_post_status( $post_id );

		$reject_url  = admin_url( 'admin-post.php?action=reject_contract&post_id=' . $post_id );
		$approve_url = admin_url( 'admin-post.php?action=approve_contract&post_id=' . $post_id );

		$reject_button_class  = 'button-secondary';
		$approve_button_class = 'button-primary';

		if ( 'rejected' === $post_status ) {
			$reject_button_class .= ' disabled';
		} elseif ( 'approved' === $post_status ) {
			$approve_button_class .= ' disabled';
		}
		?>
		<div class="misc-pub-section">
			<div id="minor-publishing-actions">
				<div id="save-action">
					<a href="<?php echo esc_url( $reject_url ); ?>" class="button <?php echo esc_attr( $reject_button_class ); ?>">Reject</a>
					<a href="<?php echo esc_url( $approve_url ); ?>" class="button <?php echo esc_attr( $approve_button_class ); ?>">Approve</a>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Handle reject contract action.
	 */
	public static function handle_reject_contract() {
		if ( isset( $_GET['post_id'] ) && ! empty( $_GET['post_id'] ) ) {
			$post_id = intval( $_GET['post_id'] );
			$post    = get_post( $post_id );

			if ( $post && 'contract' === $post->post_type ) {
				$updated_post = [
					'ID'          => $post_id,
					'post_status' => 'rejected',
				];
				wp_update_post( $updated_post );
			}
		}

		wp_safe_redirect( admin_url( 'edit.php?post_type=contract' ) );
		exit;
	}

	/**
	 * Handle approve contract action.
	 */
	public static function handle_approve_contract() {
		if ( isset( $_GET['post_id'] ) && ! empty( $_GET['post_id'] ) ) {
			$post_id = intval( $_GET['post_id'] );
			$post    = get_post( $post_id );

			if ( $post && 'contract' === $post->post_type ) {
				$updated_post = [
					'ID'          => $post_id,
					'post_status' => 'approved',
				];
				wp_update_post( $updated_post );
			}
		}

		wp_safe_redirect( admin_url( 'edit.php?post_type=contract' ) );
		exit;
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
				'rejected' => 'bg-[#eba3a3] text-[#570000]',
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
	 * 取得狀態標籤
	 *
	 * @param string $post_status 文章狀態
	 * @return string
	 */
	public static function get_status_tag( string $post_status ): string {

		$info = match ($post_status) {
			'pending' => [
				'label' => '審核中',
				'class' => 'bg-[#f8dda7] text-[#573b00]',
			],
			'approved' => [
				'label' => '已審核',
				'class' => 'bg-[#c8d7e1] text-[#003d66]',
			],
			'rejected' => [
				'label' => '已拒絕',
				'class' => 'bg-[#eba3a3] text-[#570000]',
			],
			default => [
				'label' => '未知狀態',
				'class' => 'bg-[#f8dda7] text-[#573b00]',
			],
		};

		return sprintf(
			/*html*/'<span class="w-fit h-fit px-2 py-1 text-xs rounded-md %1$s">%2$s</span>',
			$info['class'],
			$info['label'],
			);
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
		$bulk_actions['change-to-rejected'] = __('Change to Rejected', 'power_contract');

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

		if ('change-to-rejected' === $action) {
			foreach ($post_ids as $post_id) {
				\wp_update_post(
					[
						'ID'          => $post_id,
						'post_status' => 'rejected',
					]
					);
			}
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

	/**
	 * 調整 post meta 新增/刪除顯示欄位
	 *
	 * @param int   $post_id 文章 ID
	 * @param array $post_meta 文章 meta
	 * @return array
	 */
	private static function post_meta_format( int $post_id, array $post_meta ): array {
		unset($post_meta['_edit_lock']);
		unset($post_meta['_thumbnail_id']);
		unset($post_meta['_order_id']);

		// add screenshot_url
		$screenshot_url               = \get_post_meta( $post_id, 'screenshot_url', true );
		$signed_contract              = $screenshot_url ? sprintf(
		/*html*/'<a href="%1$s" target="_blank"><img src="%1$s" style="%2$s" /></a>',
		$screenshot_url,
		'width: 10rem;border: 1px solid #ccc;'
		) : '';
		$post_meta['signed_contract'] = [ $signed_contract ];

		// add signed_at
		// get local time
		$post                   = \get_post( $post_id );
		$signed_at_timestamp    = \get_the_date( 'U', $post );
		$signed_at              = \wp_date( 'Y-m-d H:i:s', $signed_at_timestamp );
		$post_meta['signed_at'] = [ $signed_at ];

		// 如果有訂單關聯，則新增訂單資訊
		$order_array = [];
		if (class_exists('WooCommerce')) {
			$order_id = \get_post_meta($post_id, '_order_id', true);
			$order    = $order_id ? \wc_get_order($order_id) : null;
			if ($order) {
				$order_number     = $order->get_order_number();
				$order_link       = \get_edit_post_link($order_id);
				$customer_id      = $order->get_customer_id();
				$customer_name    = $order->get_formatted_billing_full_name();
				$customer_email   = $order->get_billing_email();
				$customer_phone   = $order->get_billing_phone();
				$customer_address = Base::get_full_address($customer_id, 'shipping');

				$order_array = [
					'relation_order_id' => $order ? [ sprintf('<a href="%1$s" target="_blank">%2$s</a>', $order_link, "#{$order_number}") ] : [ '' ],
					'customer_name'     => [ $customer_name ],
					'customer_email'    => [ $customer_email ],
					'customer_phone'    => [ $customer_phone ],
					'customer_address'  => [ $customer_address ],
				];
			}
		}
		$post_meta = array_merge($post_meta, $order_array);

		// turn key to i18n
		$post_meta_i18n = [];
		foreach ($post_meta as $key => $value) {
			$post_meta_i18n[ Base::i18n($key) ] = $value;
		}

		return $post_meta_i18n;
	}
}
