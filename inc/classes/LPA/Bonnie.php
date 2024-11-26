<?php
/**
 * LPA 學吧串接 Bonnie 推播模組
 *
 * @see Asana https://app.asana.com/0/1208673658605052/1208713252336840/f
 * @see Bonnie API doc https://docs.botbonnie.com/jiao-xue-fan-li/ru-he-shi-yong-json-xun-xi#1.-json-xun-xi-fan-li
 * @see 注意❗❗ 有320字限制超過的話訊息會直接吃掉，也不會報錯❗❗  https://docs.botbonnie.com/jiao-xue-fan-li/ru-he-shi-yong-json-xun-xi/zhi-yuan-de-xun-xi-ge-shi
 *
 * 之前請 Oberon 協助加了
 * $buttons_item['value'] = apply_filters( 'bot_bonnie_button_url', $url, $value, $this->request );
 * 在他的 wp-content/plugins/bonnie 外掛
 * 好讓我們可以把參數加到按鈕的 url 上
 * 讓用戶點擊按鈕時透過 GET 取得預設的參數(姓名、電話、價格、地址)
 */

declare(strict_types=1);

namespace J7\PowerContract\LPA;

use J7\PowerContract\Resources\ContractTemplate\Init;

if (class_exists('J7\PowerContract\LPA\Bonnie')) {
	return;
}

// 如果沒有安裝 Oberon 的 bonnie 外掛，就 return
if (!class_exists('\Bonnie\Api\Bonnie_Api')) {
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
	 * @deprecated 使用訊息推播，不是推模組
	 * @var string
	 */
	private $bonnie_module_id = 'module-lzT2zotAta';


	/**
	 * 訂單完成後推播的合約模板 contract_template_id
	 *
	 * @var int
	 */
	private $contract_template_id = 470975;

	/**
	 * Constructor
	 */
	public function __construct() {
		// \add_filter('bot_bonnie_button_url', [ $this, 'add_params_to_bonnie_button_url' ], 10, 3);
		\add_action( 'woocommerce_order_status_completed', [ $this, 'push_bonnie_module' ], 10, 1 );
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
	 */
	public function add_params_to_bonnie_button_url( $url, $value, $request ) {
		// 如果 $url 不包含 /contract_template/ 就 return
		if (strpos($url, Init::POST_TYPE) === false) {
			return $url;
		}

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
	 *
	 * @param int $order_id 訂單 ID
	 */
	public function push_bonnie_module( $order_id ) {
		$order    = \wc_get_order($order_id);
		$customer = $order->get_user();
		if (!$customer) {
			return;
		}

		// 暫時性將 order_id 存到用戶的 meta 裡
		\update_user_meta($customer->ID, 'order_id_tmp', $order_id);

		// bonnie 上的 user id
		$bonnie_bot_raw_id = \get_user_meta($customer->ID, 'bonnie_bot_raw_id', true);

		// bot_pid = LINE OA id，本地環境實為了方便測試，固定為 281jvjai
		$bot_pid = 'local' === \wp_get_environment_type() ? '281jvjai' : \Bonnie\Api\Bonnie_Api::get_bot_pid($order_id);

		$push = new \Bonnie\Api\Bonnie_Push( $bonnie_bot_raw_id, $bot_pid );

		$permalink = \get_permalink($this->contract_template_id);
		$permalink = \add_query_arg(
			[
				'order_id' => $order_id,
			],
			$permalink
		);

		$result = $push->add_message(
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
}
