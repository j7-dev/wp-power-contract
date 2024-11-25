<?php
/**
 * LPA 學吧串接 Bonnie 推播模組
 *
 * @see Asana https://app.asana.com/0/1208673658605052/1208713252336840/f
 * @see Bonnie API doc https://docs.botbonnie.com/jiao-xue-fan-li/ru-he-shi-yong-json-xun-xi#1.-json-xun-xi-fan-li
 *
 * 之前請 Oberon 協助加了
 * $buttons_item['value'] = apply_filters( 'bot_bonnie_button_url', $url, $value, $this->request );
 * 在他的 wp-content/plugins/bonnie 外掛
 * 好讓我們可以把參數加到按鈕的 url 上
 * 讓用戶點擊按鈕時透過 GET 取得預設的參數(姓名、電話、價格、地址)
 */

declare(strict_types=1);

namespace J7\PowerContract\LPA;

if (class_exists('J7\PowerContract\LPA\Bonnie')) {
	return;
}
/**
 * Class Bonnie
 */
final class Bonnie {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_filter('bot_bonnie_button_url', [ __CLASS__, 'add_params_to_bonnie_button_url' ], 10, 3);
	}

	/**
	 * 將預設的參數加到 Bonnie 按鈕的 url 上
	 *
	 * @param string      $url 按鈕的 url
	 * @param string      $value 按鈕的 value
	 * @param \WP_Request $request 請求的參數
	 * @return string
	 */
	public static function add_params_to_bonnie_button_url( $url, $value, $request ) {

		ob_start();
		var_dump(
			[
				'url'   => $url,
				'value' => $value,
			]
			);
		\J7\WpUtils\Classes\ErrorLog::info('' . ob_get_clean());

		return $url;
	}
}
