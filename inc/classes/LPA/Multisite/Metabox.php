<?php
/**
 * 多站點 Metabox 類
 *
 * @package PowerContract
 */

namespace J7\PowerContract\LPA\Multisite;

use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplate;


/**
 * Metabox 類
 */
final class Metabox {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * 支援的文章類型
	 *
	 * @var array<string>
	 */
	private $supported_post_types;

	/**
	 * 建構函數
	 */
	public function __construct() {
		$this->supported_post_types = [
			ContractTemplate::POST_TYPE,
		];

		// 添加 metabox
		\add_action('add_meta_boxes', [ $this, 'add_blog_metabox' ]);

		// 儲存 metabox 資料
		foreach ($this->supported_post_types as $post_type) {
			\add_action("save_post_{$post_type}", [ $this, 'save_blog_metabox' ], 10, 2);
		}
	}

	/**
	 * 添加網站選擇 metabox
	 *
	 * @return void
	 */
	public function add_blog_metabox() {
		foreach ($this->supported_post_types as $post_type) {
			\add_meta_box(
				'blog_selector',
				\__('所屬網站', 'power-contract'),
				[ $this, 'render_blog_metabox' ],
				$post_type,
				'side',
				'high'
			);
		}
	}

	/**
	 * 渲染網站選擇 metabox
	 *
	 * @param \WP_Post $post 文章物件
	 * @return void
	 */
	public function render_blog_metabox( $post ) {
		// 獲取當前文章的網站 ID
		$current_blog_id = \get_post_meta($post->ID, Integration::BLOG_ID_META_KEY, true);
		if (!$current_blog_id) {
			\restore_current_blog();
			$current_blog_id = \get_current_blog_id();
		}

		// 獲取所有網站
		$sites = \get_sites(
			[
				'fields' => 'all',
			]
			);

		// 新增安全檢查
		\wp_nonce_field('blog_selector_nonce', 'blog_selector_nonce');

		// 輸出下拉選單
		?>
		<select name="blog_id" id="blog_id" class="widefat" style="box-sizing:border-box;">
		<?php foreach ($sites as $site) : ?>
				<option value="<?php echo \esc_attr($site->blog_id); ?>" <?php \selected($current_blog_id, $site->blog_id); ?>>
			<?php echo \esc_html($site->blogname); ?>
				</option>
			<?php endforeach; ?>
		</select>
		<p class="description">
		<?php \esc_html_e('選擇合約模板要在哪個子站使用', 'power-contract'); ?>
		</p>
		<?php
	}

	/**
	 * 儲存網站選擇
	 *
	 * @param int      $post_id 文章 ID
	 * @param \WP_Post $post    文章物件
	 * @return void
	 */
	public function save_blog_metabox( $post_id, $post ) {
		// 檢查自動儲存
		if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
			return;
		}

		// 驗證 nonce
		if (!isset($_POST['blog_selector_nonce']) || !\wp_verify_nonce($_POST['blog_selector_nonce'], 'blog_selector_nonce')) { // phpcs:ignore
			return;
		}

		// 檢查權限
		if (!current_user_can('edit_post', $post_id)) {
			return;
		}

		// 儲存網站 ID
		if (isset($_POST['blog_id'])) {
			$blog_id = (int) $_POST['blog_id'];
			\update_post_meta($post_id, Integration::BLOG_ID_META_KEY, $blog_id);
		}
	}
}
