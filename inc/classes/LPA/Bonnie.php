<?php
/**
 * LPA 學吧串接 Bonnie 推播模組
 *
 * @see Asana https://app.asana.com/0/1208673658605052/1208713252336840/f
 * @see Bonnie API doc https://docs.botbonnie.com/jiao-xue-fan-li/ru-he-shi-yong-json-xun-xi#1.-json-xun-xi-fan-li
 * @see 注意❗❗ LINE 有320字限制超過的話訊息會直接吃掉，也不會報錯❗❗  https://docs.botbonnie.com/jiao-xue-fan-li/ru-he-shi-yong-json-xun-xi/zhi-yuan-de-xun-xi-ge-shi
 *
 * 之前請 Oberon 協助加了
 * $buttons_item['value'] = apply_filters( 'bot_bonnie_button_url', $url, $value, $this->request );
 * 在他的 wp-content/plugins/bonnie 外掛
 * 好讓我們可以把參數加到按鈕的 url 上
 * 讓用戶點擊按鈕時透過 GET 取得預設的參數(姓名、電話、價格、地址)
 */

declare(strict_types=1);

namespace J7\PowerContract\LPA;

use J7\PowerContract\LPA\Multisite\Integration;
use J7\PowerContract\Resources\ContractTemplate\Init;
use J7\WpUtils\Classes\General;
use J7\PowerContract\LPA\Order\Utils;

if (class_exists('J7\PowerContract\LPA\Bonnie')) {
	return;
}

/**
 * Class Bonnie
 */
final class Bonnie {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * 訂單完成後推播的 Bonnie 模組 ID
	 *
	 * @deprecated 使用訊息推播，不是推模組，所以目前不會用到
	 * @var string
	 */
	private $bonnie_module_id = 'module-lzT2zotAta'; // @phpstan-ignore-line


	/**
	 * 訂單完成後推播的合約模板 contract_template_id
	 *
	 * @deprecated 改用 get_contract_template_id
	 * @var int
	 */
	private $contract_template_id = 470975;

	/**
	 * Constructor
	 */
	public function __construct() {

		// 如果沒有安裝 Oberon 的 bonnie 外掛，就 return
		if (!class_exists('\Bonnie\Api\Bonnie_Api')) {
			return;
		}
		\add_action( 'wp_head', [ __CLASS__, 'custom_style' ], 99 );
		// \add_filter('bot_bonnie_button_url', [ $this, 'add_params_to_bonnie_button_url' ], 10, 3);

		// 訂單完成後推播簽約訊息
		\add_action( 'woocommerce_order_status_completed', [ $this, 'push_bonnie_module_for_sign' ], 10, 1 );

		// 簽約完成後推播訊息給 用戶
		\add_action('power_contract_contract_created', [ $this, 'push_bonnie_module_to_user_for_archive' ], 10, 3);

		// 覆寫選擇的合約模板
		\add_filter('power_contract_chosen_contract_template', [ __CLASS__, 'get_contract_template_id' ], 100, 1);

		// 在訂單創建時保存當前子站 ID（不論是從結帳頁面還是後台創建）
		\add_action(
			'woocommerce_new_order',
			function ( $order_id ) {
				$order = \wc_get_order($order_id);
				if ($order) {
					$order->update_meta_data('_blog_id', (string) \get_current_blog_id());
					$order->save();
				}
			},
			10,
			1
			);

		// 將原本訂單完成的推播訊息移動到合約審核後推播
		\remove_action( 'woocommerce_order_status_completed', 'Bonnie\Api\Bonnie_Api::send_course_permission_message', 10 );
		\remove_action( 'woocommerce_order_status_completed', 'Bonnie\Order::order_completed', 10 );
		// 先移除，再重新添加，加入判斷條件
		\add_action( 'woocommerce_order_status_completed', [ __CLASS__, 'maybe_send_messages' ], 20, 1 );
		\add_action( 'power_contract_contract_approved', [ __CLASS__, 'push_messages' ], 10, 3 );

		// 不需要重新導向到 THANKYOU PAGE
		\add_filter('power_contract_contract_created_redirect_url', fn() => '', 100);

		// 覆寫簽約後的 modal 動作按鈕
		\add_filter('power_contract_signed_btn_text', fn() => '完成，回 LINE', 100);
		\add_filter('power_contract_signed_btn_link', [ __CLASS__, 'override_signed_btn_link' ], 100);
	}

	/**
	 * 先移除原本的發送訊息 callback
	 * 再重新添加，加入判斷條件
	 *
	 * @param int $order_id 訂單 ID
	 * @return void
	 */
	public static function maybe_send_messages( $order_id ) {
		$order                         = \wc_get_order($order_id);
		$include_need_contract_product = Utils::include_need_contract_product( $order );

		// 如果包含簽約商品，就退出，什麼也不做，改為合約審核後推播
		if ($include_need_contract_product) {
			\J7\WpUtils\Classes\WC::log(
				'',
				'maybe_send_messages 什麼也不做，改為合約審核後推播',
				'info',
				[
					'source'   => 'power-contract',
					'order_id' => $order_id,
				]
				);
			return;
		}

		// 如果不包含簽約商品，就推播訊息
		\call_user_func( [ '\Bonnie\Api\Bonnie_Api', 'send_course_permission_message' ], $order_id );
		\call_user_func( [ '\Bonnie\Order', 'order_completed' ], $order_id );
	}

	/** phpcs:disable
	 *
	 * 將預設的參數加到 Bonnie 按鈕的 url 上
	 * @deprecated 改成訂單完成後觸發
	 *
	 * @param string      $url 按鈕的 url ex: https://learningpatest.kinsta.cloud/contract_template/{slug}
	 * @param array{
	 *       btn_text: string,
	 *       btn_type: string,
	 *       btn_link: string,
	 *       btn_param: bool,
	 *       zoom_confno: string,
	 *       zoom_pwd: string,
	 *       zoom_account: string,
	 *       zoom_display_name: string,
	 *       zoom_webinar: string,
	 *       zoom_bot_tag: bool,
	 *      } $value 按鈕的 value
	 * @param \WP_Request $request 請求的參數
	 *  - body: array<empty>
	 *  - query: array{field: string}
	 *  - json: array{bot_id:string, bot_raw_uid:string, bot_uid:string, bot_pid:string} 用戶 LINE 訊息 pid 是 LINE OA id, uid 是 LINE 用戶 id
	 * phpcs:enable
	 * @return string 按鈕的 url
	 * @phpstan-ignore-next-line
	 */
	public function add_params_to_bonnie_button_url( $url, $value, $request ) {
		// 如果 $url 不包含 /contract_template/ 就 return
		if (strpos($url, Init::POST_TYPE) === false) {
			return $url;
		}

		// @phpstan-ignore-next-line
		$body_params = $request->get_json_params();
		// 用 bonnie_bot_raw_id 找 user
		$bonnie_bot_raw_id = $body_params['bot_raw_uid'] ?? '';
		if (!$bonnie_bot_raw_id) {
			return $url;
		}

		// 如果是在 local 環境，就使用測試模組
		if ('local' === \wp_get_environment_type()) {
			// 測試模組
			$this->bonnie_module_id = 'module-lzT2zotAta';
		}

		$users = \get_users(
			[
				'meta_key'   => 'bonnie_bot_raw_id',
				'meta_value' => $bonnie_bot_raw_id,
				'number'     => 1,
				'orderby'    => 'ID',
				'order'      => 'DESC',
			]
			);

		// TODO 如果找不到用戶，行為要再確認
		// if (empty($users)) {
		// return $url;
		// }

		/** @var \WP_User $user */
		$user = reset($users);

		// 取得 姓名、電話、價格、地址
		$name         = $user->display_name;
		$phone        = \get_user_meta($user->ID, 'billing_phone', true);
		$price        = '';
		$full_address = self::get_full_address($user->ID, 'shipping');

		$url = \add_query_arg(
			[
				'name'         => $name,
				'phone'        => $phone,
				'price'        => $price,
				'full_address' => $full_address,
			],
			$url
		);

		return $url;
	}

	/**
	 * 推播 Bonnie 模組
	 * 訂單完成後，推 LINE 訊息給用戶線上簽約網址
	 *
	 * @param int $order_id 訂單 ID
	 * @return void
	 */
	public function push_bonnie_module_for_sign( $order_id ) {

		$order    = \wc_get_order($order_id);
		$customer = $order->get_user();
		if (!$customer) {
			return;
		}

		$order_blog_id = (int) $order->get_meta('_blog_id');

		\J7\WpUtils\Classes\WC::log(
				'',
				'push_bonnie_module_for_sign',
				'info',
				[
					'source'        => 'power-contract',
					'order_id'      => $order_id,
					'order_blog_id' => $order_blog_id,
				]
				);

		// 子站中的訂單完成時，都會循環執行，但只需要執行一次就好了
		\restore_current_blog();
		if ($order_blog_id !== \get_current_blog_id()) {
			return;
		}

		// 如果沒有簽約商品也不用簽約
		$include_need_contract_product = Utils::include_need_contract_product( $order );
		if (!$include_need_contract_product) {
			\J7\WpUtils\Classes\WC::log(
				'',
				'push_bonnie_module_for_sign 訂單內沒有簽約商品，不需要簽約',
				'info',
				[
					'source'   => 'power-contract',
					'order_id' => $order_id,
				]
				);
			return;
		}

		// 訂金商品不需要簽約
		$include_deposit = Utils::include_deposit( $order );
		if ( $include_deposit ) {
			\J7\WpUtils\Classes\WC::log(
				'',
				'訂金商品不需要簽約',
				'info',
				[
					'source'          => 'power-contract',
					'order_id'        => $order_id,
					'include_deposit' => $include_deposit,
				]
				);
			return;
		}

		// 暫時性將 order_id 存到用戶的 meta 裡
		\update_user_meta($customer->ID, 'order_id_tmp', $order_id);

		// bonnie 上的 user id
		$bonnie_bot_raw_id = \get_user_meta($customer->ID, 'bonnie_bot_raw_id', true);

		// bot_pid = LINE OA id，本地環境實為了方便測試，固定為 281jvjai
		$bot_pid = 'local' === \wp_get_environment_type() ? '281jvjai' : \Bonnie\Api\Bonnie_Api::get_bot_pid($order_id);

		$push = new \Bonnie\Api\Bonnie_Push( $bonnie_bot_raw_id, $bot_pid );

		$permalink = $this->get_contract_template_permalink($order_id);

		if (!$permalink) {
			return;
		}

		$push->add_message(
			'已經收到您的訂單，點下方完成簽約',
			[
				[
					'title' => '立即線上簽約 →',
					'type'  => 'web_url',
					'value' => $permalink,
				],
			]
			);
	}


	/**
	 * 推播 Bonnie 模組
	 * 簽約完成後，推 LINE 訊息給用戶留底
	 *
	 * @param int                  $contract_id 合約 ID
	 * @param array<string, mixed> $args 合約資料
	 * @param string               $blog_id 子站 ID
	 * @return void
	 */
	public function push_bonnie_module_to_user_for_archive( $contract_id, $args, $blog_id ): void {

		\switch_to_blog($blog_id);
		$author_id = \get_post_field('post_author', $contract_id);

		// bonnie 上的 user id
		$bot_raw_uid = \get_user_meta( (int) $author_id, 'bonnie_bot_raw_id', true);

		// 合約連結的訂單 id
		$order_id = \get_post_meta($contract_id, '_order_id', true);

		$screenshot_url = \get_post_meta($contract_id, 'screenshot_url', true);

		// bot_pid = LINE OA id，本地環境實為了方便測試，固定為 281jvjai
		$bot_pid = 'local' === \wp_get_environment_type() ? '281jvjai' : \Bonnie\Api\Bonnie_Api::get_bot_pid($order_id);

		if ($screenshot_url) {
			$bonnie_push_instance                  = new BonniePush( $bot_raw_uid, $bot_pid );
			$bonnie_push_instance->body['message'] = [
				'type'     => 'image',
				'imageUrl' => $screenshot_url,
			];
			$result                                = $bonnie_push_instance->process();
		}

		$bonnie_push_instance = new BonniePush( $bot_raw_uid, $bot_pid );
		$bonnie_push_instance->add_message( '已收到您的簽屬，請稍待專員審閱，完成後會立即通知您，就可以觀看課程了' );
		\restore_current_blog();
	}

	/**
	 * 取得用戶的完整地址
	 *
	 * @param int    $user_id 用戶 ID
	 * @param string $type 地址類型 billing 或 shipping
	 * @return string 用戶的完整地址
	 */
	public static function get_full_address( $user_id, $type = 'billing' ) {

		$fields = [
			"_{$type}_postcode",
			"_{$type}_state",
			"_{$type}_city",
			"_{$type}_address_1",
			"_{$type}_address_2",
		];

		$full_address = '';
		foreach ($fields as $field) {
			$full_address .= \get_user_meta($user_id, $field, true);
		}

		return $full_address;
	}

	/**
	 * 取得合約模板帶上 URL params 的完整連結
	 *
	 * @deprecated 有字數限制，所以帶 order_id 就好
	 *
	 * @param int $order_id 訂單 ID
	 * @return string 合約模板帶參數的完整連結
	 */
	private function get_contract_permalink_with_params( int $order_id ) {
		$order = \wc_get_order($order_id);
		$user  = $order->get_user();
		if (!$user) {
			return '';
		}

		// 取得 姓名、電話、價格、地址
		$name         = $user->display_name;
		$phone        = \get_user_meta($user->ID, 'billing_phone', true);
		$price        = '';
		$full_address = self::get_full_address($user->ID, 'shipping');

		$permalink             = \get_permalink($this->contract_template_id);
		$permalink_with_params = \add_query_arg(
			[
				'name'         => $name,
				'phone'        => $phone,
				'price'        => $price,
				'full_address' => $full_address,
			],
			$permalink
		);

		return $permalink_with_params;
	}

	/**
	 * Custom style
	 *
	 * @return void
	 */
	public static function custom_style(): void {

		if (!General::in_url([ 'view-order' ])) {
			return;
		}
		?>
		<style>
			.woocommerce-contract-details div.flex{
					border: 1px solid var(--ast-border-color);
					padding: 1rem;
			}
		</style>
		<?php
	}

	/**
	 * 取得合約模板 ID
	 * 可能會有不同規則來顯示不同的模板
	 * 目前規則為取得主站(blog_id:1)最新發布的合約模板
	 *
	 * @return int|null
	 */
	public static function get_contract_template_id(): int|null {
		\restore_current_blog();
		$current_blog_id = \get_current_blog_id();
		// 從主站(blog_id:1) 取得當前子站的合約模板
		\switch_to_blog(1);
		$post_ids = \get_posts(
		[ // @phpstan-ignore-line
			'post_type'      => Init::POST_TYPE,
			'posts_per_page' => 1,
			'orderby'        => 'date',
			'order'          => 'DESC',
			'fields'         => 'ids',
			'meta_key'       => Integration::BLOG_ID_META_KEY,
			'meta_value'     => $current_blog_id,
		]
		);

		\restore_current_blog();

		if (!$post_ids || !\is_array($post_ids)) {
			return null;
		}

		return $post_ids[0];
	}


	/**
	 * 合約審核後推播課程開通訊息
	 * 原本是 [訂單完成時] 改為 [合約審核完成時]
	 *
	 * @param string   $new_status 新狀態
	 * @param string   $old_status 舊狀態
	 * @param \WP_Post $post 合約文章物件
	 * @return void
	 * @throws \Exception 如果 Bonnie_Api 外掛不存在, 訂單 id 不存在, 則拋出例外
	 */
	public static function push_messages( $new_status, $old_status, $post ): void {
		try {

			if (!class_exists('\Bonnie\Api\Bonnie_Api')) {
				throw new \Exception('Bonnie_Api 外掛不存在, \Bonnie\Api\Bonnie_Api class not found J7\PowerContract\LPA\Bonnie::push_messages');
			}

			\restore_current_blog();
			$blog_id  = \get_post_meta($post->ID, '_blog_id', true) ?: \get_current_blog_id();
			$order_id = \get_post_meta($post->ID, '_order_id', true);

			if (!$order_id) {
				throw new \Exception('訂單 id 不存在, order_id not found J7\PowerContract\LPA\Bonnie::push_messages');
			}

			// 切換到子站獲取資料
			\switch_to_blog($blog_id);
			\J7\WpUtils\Classes\WC::log(
				[
					'order_id' => $order_id,
					'blog_id'  => $blog_id,
				],
				"發送推播 [ '\Bonnie\Api\Bonnie_Api', 'send_course_permission_message' ] J7\PowerContract\LPA\Bonnie::push_messages",
				'info',
				[
					'source' => 'power-contract',
				]
				);
			\call_user_func( [ '\Bonnie\Api\Bonnie_Api', 'send_course_permission_message' ], $order_id );
			\call_user_func( [ '\Bonnie\Order', 'order_completed' ], $order_id );
			\restore_current_blog();
		} catch (\Throwable $th) {
			\J7\WpUtils\Classes\WC::log(
				'',
				$th->getMessage(),
				'info',
				[
					'source' => 'power-contract',
				]
				);
		}
	}

	/**
	 * 覆寫簽約後的 modal 動作按鈕
	 *
	 * @param string $link 原本的按鈕連結
	 * @return string 覆寫後的按鈕連結
	 */
	public static function override_signed_btn_link( $link ): string {
		$order_id = (int) ( $_GET['order_id'] ?? 0 ); // phpcs:ignore
		\restore_current_blog();
		$blog_id  = (int) ( $_GET['blog_id'] ?? \get_current_blog_id() ); // phpcs:ignore
		if (!$order_id) {
			return $link;
		}

		\switch_to_blog($blog_id);
		$order = \wc_get_order($order_id);
		if (!( $order instanceof \WC_Order )) {
			\restore_current_blog();
			return $link;
		}

		/** @var \WC_Order_Item_Product[] $items */
		$items = $order->get_items();
		if (empty($items)) {
			\restore_current_blog();
			return $link;
		}

		// 變化類型會取到父商品
		$product_id = reset($items)->get_product_id();

		$product = \wc_get_product($product_id);
		if (!( $product instanceof \WC_Product )) {
			\restore_current_blog();
			return $link;
		}

		// 取得 LINE 官方帳號代稱 LINE OA id (填寫在商品頁)
		$bot_pid = $product->get_meta('bot_pid');

		if (!$bot_pid) {
			\restore_current_blog();
			return $link;
		}

		\restore_current_blog();
		return "https://line.me/R/ti/p/@{$bot_pid}";
	}

	/**
	 * 取得合約模板的完整連結
	 *
	 * @param int $order_id 訂單 ID
	 * @return string
	 */
	private function get_contract_template_permalink( $order_id ): string {

		$contract_template_id = self::get_contract_template_id();

		$log = new \WC_Logger();
		$log->info(
			print_r(
			[
				'order_id'             => $order_id,
				'contract_template_id' => $contract_template_id,
			],
			true
			),
		[ 'source' => 'power-contract' ]
			);

		if (!$contract_template_id) {
			return '';
		}

		\switch_to_blog(1);
		$permalink = \get_permalink($contract_template_id);
		\restore_current_blog();

		$order     = \wc_get_order($order_id);
		$author_id = $order->get_customer_id();
		// bonnie 上的 user id
		$bot_raw_id = \get_user_meta($author_id, 'bonnie_bot_raw_id', true);

		$permalink = \add_query_arg(
			[
				'order_id'   => $order_id,
				'blog_id'    => \get_current_blog_id(),
				'bot_raw_id' => $bot_raw_id,
			],
			$permalink
		);

		return $permalink;
	}
}
