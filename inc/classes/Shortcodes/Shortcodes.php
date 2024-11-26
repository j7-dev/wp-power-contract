<?php
/**
 * Shortcodes
 */

declare(strict_types=1);

namespace J7\PowerContract\Shortcodes;

use J7\PowerContract\Utils\Base;

if (class_exists('J7\PowerContract\Shortcodes\Shortcodes')) {
	return;
}
/**
 * Class Shortcodes
 */
final class Shortcodes {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * 所有短碼
	 *
	 * @var array<string>
	 */
	public static array $shortcodes = [
		'pct_input',
		'pct_seal',
		'pct_signature',
		'pct_date',
	];


	/**
	 * 所有短碼範例
	 *
	 * @var array<string, array{shortcode: string, label: string, description: string}>
	 */
	public static array $shortcode_examples = [
		'user_name' => [
			'shortcode'   => '[pct_input name="user_name"]',
			'label'       => '姓名輸入框',
			'description' => '可輸入 <code>name</code>, <code>width</code>, <code>placeholder</code>, <code>style</code>, <code>class</code>, <code>id</code> 屬性來指定欄位名稱、寬度、placeholder css 樣式、css 類別、與 id',
		],
		'user_address' => [
			'shortcode'   => '[pct_input name="user_address" width="320px"]',
			'label'       => '地址輸入框',
			'description' => '可輸入 <code>name</code>, <code>width</code>, <code>placeholder</code>, <code>style</code>, <code>class</code>, <code>id</code> 屬性來指定欄位名稱、寬度、placeholder css 樣式、css 類別、與 id',
		],
		'user_identity' => [
			'shortcode'   => '[pct_input name="user_identity"]',
			'label'       => '身分證字號輸入框',
			'description' => '可輸入 <code>name</code>, <code>width</code>, <code>placeholder</code>, <code>style</code>, <code>class</code>, <code>id</code> 屬性來指定欄位名稱、寬度、placeholder css 樣式、css 類別、與 id',
		],
		'user_phone' => [
			'shortcode'   => '[pct_input name="user_phone"]',
			'label'       => '手機號碼輸入框',
			'description' => '可輸入 <code>name</code>, <code>width</code>, <code>placeholder</code>, <code>style</code>, <code>class</code>, <code>id</code> 屬性來指定欄位名稱、寬度、placeholder css 樣式、css 類別、與 id',
		],
		'contract_amount' => [
			'shortcode'   => '[pct_input name="contract_amount"]',
			'label'       => '合約金額輸入框',
			'description' => '可輸入 <code>name</code>, <code>width</code>, <code>placeholder</code>, <code>style</code>, <code>class</code>, <code>id</code> 屬性來指定欄位名稱、寬度、placeholder css 樣式、css 類別、與 id',
		],
		'pct_seal' => [
			'shortcode'   => '[pct_seal]',
			'label'       => '公司章',
			'description' => '可輸入 <code>style</code>, <code>class</code>, <code>id</code> 屬性來指定 css 樣式、css 類別、與 id',
		],
		'pct_signature' => [
			'shortcode'   => '[pct_signature]',
			'label'       => '簽名板',
			'description' => '可輸入 <code>style</code>, <code>class</code>, <code>id</code> 屬性來指定 css 樣式、css 類別、與 id',
		],
		'pct_date' => [
			'shortcode'   => '[pct_date]',
			'label'       => '日期',
			'description' => '
			可輸入 <code>format</code>, <code>base</code> 屬性來指定日期格式與基準<br>
			例如：<code>[pct_date format="中華民國 Y 年 m 月 d 日" base="tw"]</code> 會顯示"中華民國 112 年 11 月 23 日"，不帶參數的話預設也是這樣顯示<br>
			例如：<code>[pct_date format="西元 Y 年 m 月 d 日" base="ad"]</code> 會顯示"西元 2024 年 11 月 23 日"<br>
			<code>base</code> 如果輸入 <code>ad</code> 則會顯示西元日期，如果輸入 <code>tw</code> 則會顯示中華民國日期<br>
			<code>format</code> 可以輸入中文字加上<code>Y</code>、<code>m</code>、<code>d</code> 來顯示年月日',
		],
	];

	/**
	 * Constructor
	 */
	public function __construct() {
		foreach (self::$shortcodes as $shortcode) {
			\add_shortcode($shortcode, [ __CLASS__, "{$shortcode}_callback" ]);
		}

		\add_filter('power_contract_input_args', [ __CLASS__, 'set_default_value' ], 10, 1);
	}


	/**
	 * 短碼 pct_input callback
	 * 輸入框
	 *
	 * @param array $params 短碼參數
	 * @return string
	 */
	public static function pct_input_callback( array $params ): string {

		$default_args = [
			'name'        => '',
			'width'       => '160px',
			'placeholder' => '請輸入',
			'class'       => '',
			'id'          => '',
			'type'        => 'text',
			'value'       => '',
		];

		$args = \wp_parse_args(
		$params,
		$default_args,
		);

		$args = \apply_filters('power_contract_input_args', $args);

		[
			'name' => $name,
			'width' => $width,
			'placeholder' => $placeholder,
			'class' => $class,
			'id' => $id,
			'type' => $type,
			'value' => $value,
		] = $args;

		$html = sprintf(
		/*html*/'
		<input type="%1$s" name="%2$s" class="cant_edit py-0.5 px-3 appearance-none outline-none border-none focus:outline-none focus:ring-0 focus:border-none text-[1.125em] max-w-full %3$s" style="width: %4$s;border-bottom: 1px solid #111;" placeholder="%5$s" %6$s value="%7$s" />
		',
		$type,
		$name,
		$value ? "pointer-events-none !bg-transparent {$class}" : $class, // 如果有 value 就不能編輯
		$width,
		$placeholder,
		$id ? "id=\"{$id}\"" : '',
		$value
		);

		return $html;
	}


	/**
	 * 顯示公司章 (featured image)
	 *
	 * @param array $params 短碼參數
	 * @return string
	 */
	public static function pct_seal_callback( array $params ): string {

		global $post;
		if (!$post) {
			return '找不到 $post';
		}

		$default_args = [
			'style' => 'width: 160px;',
			'class' => '',
			'id'    => '',
		];

		$args = \wp_parse_args(
		$params,
		$default_args,
		);

		$args = \apply_filters('power_contract_seal_args', $args);

		[
			'style' => $style,
			'class' => $class,
			'id' => $id,
		] = $args;

		$src = \get_post_meta($post->ID, 'seal_url', true);
		if (!$src) {
			return '❗❗❗找不到公司章❗❗❗';
		}

		$html = sprintf(
		/*html*/'
		<img src="%1$s" style="%2$s" %3$s %4$s />
		',
		$src,
		$style,
		$id ? "id=\"{$id}\"" : '',
		$class ? "class=\"{$class}\"" : ''
		);

		return $html;
	}


	/**
	 * 簽名板
	 *
	 * @param array $params 短碼參數
	 * @return string
	 */
	public static function pct_signature_callback( array $params ): string {

		global $post;
		if (!$post) {
			return '找不到 $post';
		}

		$default_args = [
			'style' => 'width: 100%;max-width: 480px;aspect-ratio: 16/9;',
			'class' => '',
			'id'    => '',
		];

		$args = \wp_parse_args(
		$params,
		$default_args,
		);

		$args = \apply_filters('power_contract_signature_args', $args);

		[
			'style' => $style,
			'class' => $class,
			'id' => $id,
		] = $args;

		$html = sprintf(
		/*html*/'
		<div %1$s %2$s>
			<div class="pct__signature cant_edit flex justify-center items-center text-2xl font-bold border border-black border-solid cursor-pointer" style="%3$s">點這簽名</div>
			<dialog class="pc-modal items-start">
				<div class="pc-modal-box w-screen max-w-[100vw] rounded-none">
					<canvas class="pct__signature-canvas"></canvas>
					<div class="pc-modal-action">
						<form method="dialog">
							<button class="pc-btn pc-btn-sm pc-btn-circle pc-btn-ghost absolute right-2 top-2">✕</button>
							<!-- if there is a button, it will close the modal -->
							<button class="pc-btn">取消</button>
							<button class="pct__signature-confirm pc-btn pc-btn-primary text-white">確認簽名</button>
						</form>
					</div>
				</div>
			</dialog>
		</div>
		',
		$id ? "id=\"{$id}\"" : '',
		$class ? "class=\"{$class}\"" : '',
		$style,
		);

		return $html;
	}

	/**
	 * 顯示日期
	 *
	 * @param array|null $atts 短碼參數
	 * @return string
	 */
	public static function pct_date_callback( ?array $atts ): string {
		$default_atts = [
			'format' => '中華民國 Y 年 m 月 d 日',
			'base'   => 'tw', // tw | ad 中華民國 | 西元
		];

		$atts = \wp_parse_args(
		$atts,
		$default_atts,
		);

		$date = new \DateTime();
		if ($atts['base'] === 'tw') {
			$year           = $date->format('Y') - 1911;
			$formatted_date = str_replace('Y', (string) $year, $atts['format']);
			$formatted_date = $date->format($formatted_date);
		} else {
			$formatted_date = $date->format($atts['format']);
		}

		return $formatted_date;
	}





	/**
	 * 設定預設值
	 *
	 * @param array $args 輸入框的參數
	 * @return array 輸入框的參數
	 */
	public static function set_default_value( array $args ): array {
		$order_id = $_GET['order_id'] ?? null; // phpcs:ignore
		if (!$order_id) {
			return $args;
		}

		$order = \wc_get_order($order_id);
		if (!$order) {
			return $args;
		}

		$user = $order->get_user();
		if (!$user) {
			return $args;
		}

		$value = match ($args['name']) {
			'user_name' => $user->display_name,
			'user_address' => Base::get_full_address($user->ID, 'shipping'),
			'user_phone' => \get_user_meta($user->ID, 'billing_phone', true),
			'contract_amount' => $order->get_total(),
			default => '',
		};

		$args['value'] = $value;

		return $args;
	}
}
