<?php
/**
 * Shortcodes
 */

declare(strict_types=1);

namespace J7\PowerContract\Shortcodes;

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
			'label'       => '公司章(連動精選圖片)',
			'description' => '可輸入 <code>style</code>, <code>class</code>, <code>id</code> 屬性來指定 css 樣式、css 類別、與 id',
		],
		'pct_signature' => [
			'shortcode'   => '[pct_signature]',
			'label'       => '簽名板',
			'description' => '可輸入 <code>style</code>, <code>class</code>, <code>id</code> 屬性來指定 css 樣式、css 類別、與 id',
		],
	];

	/**
	 * Constructor
	 */
	public function __construct() {
		foreach (self::$shortcodes as $shortcode) {
			\add_shortcode($shortcode, [ __CLASS__, "{$shortcode}_callback" ]);
		}
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
		];

		$args = \wp_parse_args(
		$params,
		$default_args,
		);

		[
			'name' => $name,
			'width' => $width,
			'placeholder' => $placeholder,
			'class' => $class,
			'id' => $id,
			'type' => $type,
		] = $args;

		$html = sprintf(
		/*html*/'
		<input type="%1$s" name="%2$s" class="cant_edit py-0.5 px-3 appearance-none outline-none border-none focus:outline-none focus:ring-0 focus:border-none text-[1.125em]" style="width: %3$s;border-bottom: 1px solid #111;" placeholder="%4$s" %5$s %6$s />
		',
		$type,
		$name,
		$width,
		$placeholder,
		$id ? "id=\"{$id}\"" : '',
		$class ? "class=\"{$class}\"" : ''
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

		[
			'style' => $style,
			'class' => $class,
			'id' => $id,
		] = $args;

		$src = \get_the_post_thumbnail_url($post->ID, 'full');
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

		[
			'style' => $style,
			'class' => $class,
			'id' => $id,
		] = $args;

		$html = sprintf(
		/*html*/'
		<div %1$s %2$s>
			<div class="pct__signature cant_edit flex justify-center items-center text-2xl font-bold border border-black border-solid cursor-pointer" style="%3$s">簽名</div>
			<dialog class="pc-modal items-start">
				<div class="pc-modal-box w-screen max-w-[100vw] h-full rounded-none">
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
}
