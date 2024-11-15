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
		];

		$args = \wp_parse_args(
		$params,
		$default_args,
		);

		$html = sprintf(
		/*html*/'
		<input type="text" name="%1$s" class="cant_edit py-0.5 px-3 appearance-none outline-none border-none focus:outline-none focus:ring-0 focus:border-none text-[1.125em]" style="width: %2$s;border-bottom: 1px solid #111;" placeholder="%3$s" />
		',
		$args['name'],
		$args['width'],
		$args['placeholder']
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
		];

		$args = \wp_parse_args(
		$params,
		$default_args,
		);

		$src = \get_the_post_thumbnail_url($post->ID, 'full');
		if (!$src) {
			return '❗❗❗找不到公司章❗❗❗';
		}

		$html = sprintf(
		/*html*/'
		<img src="%1$s" style="%2$s" />
		',
		$src,
		$args['style']
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
		];

		$args = \wp_parse_args(
		$params,
		$default_args,
		);

		$html = sprintf(
		/*html*/'
		<div>
			<div class="pct__signature cant_edit flex justify-center items-center text-2xl font-bold border border-black border-solid cursor-pointer" style="%1$s">簽名</div>
			<dialog class="pc-modal items-start">
				<div class="pc-modal-box w-screen max-w-[100vw] h-screen rounded-none">
					<canvas class="pct__signature-canvas" width="900" height="600"></canvas>
					<div class="pc-modal-action">
						<form method="dialog">
							<button class="pc-btn pc-btn-sm pc-btn-circle pc-btn-ghost absolute right-2 top-2">✕</button>
							<!-- if there is a button, it will close the modal -->
							<button class="pc-btn">取消</button>
							<button class="pct__signature-confirm pc-btn pc-btn-primary">確認簽名</button>
						</form>
					</div>
				</div>
			</dialog>
		</div>
		',
		$args['style']
		);

		return $html;
	}
}
