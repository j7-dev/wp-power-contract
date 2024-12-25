<?php
/**
 * Multisite 整合
 * 在主站(第0個子站)上的文章可以用在其他子站
 * 以 _blog_id 區分用在哪個子站
 */

declare(strict_types=1);

namespace J7\PowerContract\LPA\Multisite;

use J7\PowerContract\Resources\Contract\Init as Contract;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplate;
use J7\PowerContract\Admin\SettingsDTO;
use J7\PowerContract\Utils\Base;

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

	const BLOG_ID_META_KEY = '_blog_id';

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

		// 為每個支援的文章類型添加部落格列和修改連結
		foreach ($this->supported_post_types as $post_type) {
			\add_filter("manage_{$post_type}_posts_columns", [ $this, 'add_blog_column' ]);
			\add_action("manage_{$post_type}_posts_custom_column", [ $this, 'display_blog_info' ], 10, 2);
		}

		// 要能帶子站的訂單參數
		\add_filter('power_contract_input_args', [ __CLASS__, 'set_default_value' ], 100, 1);
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
				$new_columns['blog_name'] = '子站';
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

		$blog_id = \get_post_meta($post_id, self::BLOG_ID_META_KEY, true);
		if ($blog_id) {
			$blog_details = \get_blog_details($blog_id);
			if ($blog_details) {
				echo \esc_html($blog_details->blogname);
			}
		}
	}


	/**
	 * 設定預設值
	 *
	 * @param array $args 輸入框的參數
	 * @return array 輸入框的參數
	 */
	public static function set_default_value( array $args ): array {
		$settings_dto = SettingsDTO::instance();
		if (!$settings_dto->display_order_info) {
			return $args;
		}

		$order_id = (int) ($_GET['order_id'] ?? null); // phpcs:ignore
		$blog_id  = (int) ($_GET['blog_id'] ?? null); // phpcs:ignore 子站 id
		if (!$order_id || !$blog_id) {
			return $args;
		}

		// 切換到子站獲取資料
		\switch_to_blog($blog_id);
		$order = \wc_get_order($order_id);
		$user  = $order->get_user();
		if ( !$order || !$user) {
			\restore_current_blog();
			return $args;
		}

		// TODO 如果當前用戶與訂單用戶不同，就不自動填入，防止被猜出其他用戶個資
		// $current_user_id = \get_current_user_id();
		// if ($current_user_id !== $user->ID) {
		// return $args;
		// }

		$first_name = $order->get_billing_first_name();
		$last_name  = $order->get_billing_last_name();
		$full_name  = "{$last_name}{$first_name}";

		$value = match ($args['name']) {
			'user_name' => $full_name,
			'user_address' => Base::get_full_address($user->ID, 'shipping'),
			'user_phone' => \get_user_meta($user->ID, 'billing_phone', true),
			'contract_amount' => $order->get_total(),
			default => '',
		};

		$args['value'] = $value;

		\restore_current_blog();
		return $args;
	}
}
