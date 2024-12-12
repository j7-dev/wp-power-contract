<?php
/**
 * Multisite 整合
 * 1. 希望能管理全部子站的文章
 */

declare(strict_types=1);

namespace J7\PowerContract\LPA\Multisite;

use J7\PowerContract\Resources\Contract\Init as Contract;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplate;

if (class_exists('J7\PowerContract\LPA\Multisite\Integration')) {
	return;
}

/**
 * Multisite Integration Class
 *
 * 處理多站點整合功能，包括跨站點文章查詢和顯示
 */
final class Integration {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * 支援的文章類型
	 *
	 * @var array
	 */
	private $supported_post_types;

	/**
	 * 初始化多站點整合功能
	 */
	public function __construct() {
		$this->supported_post_types = [
			Contract::POST_TYPE,
			ContractTemplate::POST_TYPE,
		];

		// 修改查詢以包含所有子站點的文章
		\add_filter('posts_request', [ $this, 'modify_posts_query' ], 10, 2);

		// 為每個支援的文章類型添加部落格列和修改連結
		foreach ($this->supported_post_types as $post_type) {
			\add_filter("manage_{$post_type}_posts_columns", [ $this, 'add_blog_column' ]);
			\add_action("manage_{$post_type}_posts_custom_column", [ $this, 'display_blog_info' ], 10, 2);
			\add_action("save_post_{$post_type}", [ $this, 'save_blog_id' ], 10, 3);

			// 修改文章列表的連結
			\add_filter('post_row_actions', [ $this, 'modify_row_actions' ], 10, 2);
			\add_filter('page_row_actions', [ $this, 'modify_row_actions' ], 10, 2);
		}
	}

	/**
	 * 修改查詢以包含所有子站點的文章
	 *
	 * @param string    $sql 原始 SQL 查詢
	 * @param \WP_Query $query 查詢物件
	 * @return string 修改後的 SQL 查詢
	 */
	public function modify_posts_query( $sql, $query ) {
		global $wpdb;

		// 只修改特定的後台頁面和文章類型的查詢
		if (!\is_admin() ||
			!isset($_GET['post_type']) ||
			!in_array($_GET['post_type'], $this->supported_post_types, true) ||
			!$query->is_main_query()
		) {
			return $sql;
		}

		// 獲取所有部落格 ID
		$blog_ids = \get_sites(
			[
				'fields' => 'ids',
			]
		);

		// 構建 UNION 查詢
		$queries = [];
		foreach ($blog_ids as $blog_id) {
			$prefix    = $wpdb->get_blog_prefix($blog_id);
			$queries[] = $wpdb->prepare(
				"SELECT
					p.*,
					%d as blog_id
				FROM {$prefix}posts p
				WHERE p.post_type = %s
				AND p.post_status = 'publish'",
				$blog_id,
				$_GET['post_type']
			);
		}

		return implode(' UNION ', $queries);
	}

	/**
	 * 添加部落格列到文章列表
	 *
	 * @param array $columns 現有的列
	 * @return array 修改後的列
	 */
	public function add_blog_column( $columns ) {
		$new_columns = [];
		foreach ($columns as $key => $value) {
			if ($key === 'title') {
				$new_columns[ $key ]      = $value;
				$new_columns['blog_name'] = '部落格';
			} else {
				$new_columns[ $key ] = $value;
			}
		}
		return $new_columns;
	}

	/**
	 * 顯示部落格信息
	 *
	 * @param string $column_name 列名
	 * @param int    $post_id 文章 ID
	 */
	public function display_blog_info( $column_name, $post_id ) {
		if ($column_name !== 'blog_name') {
			return;
		}

		$blog_id = \get_post_meta($post_id, '_blog_id', true);
		if ($blog_id) {
			$blog_details = \get_blog_details($blog_id);
			if ($blog_details) {
				echo \esc_html($blog_details->blogname);
			}
		}
	}

	/**
	 * 保存文章時記錄部落格 ID
	 *
	 * @param int      $post_id 文章 ID
	 * @param \WP_Post $post 文章物件
	 * @param bool     $update 是否為更新
	 */
	public function save_blog_id( $post_id, $post, $update ) {
		if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
			return;
		}

		$blog_id = \get_current_blog_id();
		\update_post_meta($post_id, '_blog_id', $blog_id);
	}

	/**
	 * 修改文章列表的操作連結
	 *
	 * @param array    $actions 操作連結陣列
	 * @param \WP_Post $post 文章物件
	 * @return array 修改後的操作連結
	 */
	public function modify_row_actions( $actions, $post ) {
		global $wpdb;

		// 檢查是否為支援的文章類型
		if (!in_array($post->post_type, $this->supported_post_types, true)) {
			return $actions;
		}

		// 獲取所有部落格 ID
		$blog_ids = \get_sites(
			[
				'fields' => 'ids',
			]
		);

		// 構建 UNION 查詢來找到文章所屬的部落格
		$queries = [];
		foreach ($blog_ids as $blog_id) {
			$prefix    = $wpdb->get_blog_prefix($blog_id);
			$queries[] = $wpdb->prepare(
				"SELECT %d as blog_id FROM {$prefix}posts WHERE ID = %d", // phpcs:ignore
				$blog_id,
				$post->ID
			);
		}

		// 執行 UNION 查詢
		$blog_id = (string) $wpdb->get_var(implode(' UNION ', $queries)); // phpcs:ignore

		// 如果不是當前部落格的文章，修改連結
		if ($blog_id && $blog_id !== (string) \get_current_blog_id()) {
			// 切換到文章所屬的部落格
			\switch_to_blog($blog_id);

			// 獲取各種連結
			$edit_link   = \get_edit_post_link($post->ID);
			$delete_link = \get_delete_post_link($post->ID);

			$title = \get_the_title($post->ID);

			// 修正 permalink 結構
			$permalink_structure = \get_option('permalink_structure');
			if (empty($permalink_structure)) {
				$view_link = \add_query_arg('p', $post->ID, \get_home_url($blog_id));
			} else {
				$view_link = sprintf(
					'%s/%s/%s/',
					\untrailingslashit(\get_home_url($blog_id)),
					$post->post_type,
					$post->post_name
				);
			}

			// 重設回當前部落格
			\restore_current_blog();

			// 修改所有操作連結
			$new_actions = [];

			// 編輯
			$new_actions['edit'] = sprintf(
				'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
				\esc_url($edit_link),
				\esc_html__('編輯', 'power-contract')
			);

			// 移至垃圾桶
			$new_actions['trash'] = sprintf(
				'<a href="%s" target="_blank" rel="noopener noreferrer" class="submitdelete">%s</a>',
				\esc_url($delete_link),
				\esc_html__('移至垃圾桶', 'power-contract')
			);

			// 檢視
			$new_actions['view'] = sprintf(
				'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
				\esc_url($view_link),
				\esc_html__('檢視', 'power-contract')
			);

			return $new_actions;
		}

		return $actions;
	}
}
