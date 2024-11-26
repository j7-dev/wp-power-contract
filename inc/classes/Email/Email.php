<?php
/**
 * Email
 */

declare(strict_types=1);

namespace J7\PowerContract\Email;

use J7\PowerContract\Admin\SettingsDTO;
use J7\PowerContract\Utils\Base;
use J7\PowerContract\Resources\Contract\Init as Contract;

if (class_exists('J7\PowerContract\Email\Email')) {
	return;
}
/**
 * Class Email
 */
final class Email {
	use \J7\WpUtils\Traits\SingletonTrait;

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_action('power_contract_contract_created', [ __CLASS__, 'send_email' ], 10, 2);
	}

	/**
	 * Send email
	 *
	 * @param int                  $new_contract_id Contract ID
	 * @param array<string, mixed> $args Arguments
	 * @return void
	 */
	public static function send_email( $new_contract_id, $args ): void {
		$setting_dto = SettingsDTO::get_instance();

		$subject  = self::get_subject( (int) $new_contract_id);
		$post     = \get_post( $new_contract_id );
		$edit_url = \get_edit_post_link( $new_contract_id );

		$body = sprintf('<br><br><a href="%1$s" target="_blank">前往審核</a><br><br>', $edit_url);
		\ob_start();
		Contract::render_meta_box( $post );
		$body .= \ob_get_clean();

		$headers = [ 'Content-Type: text/html; charset=UTF-8' ];

		\wp_mail($setting_dto->emails, $subject, $body, $headers);
	}

	/**
	 * Get subject
	 *
	 * @param int $contract_id Contract ID
	 * @return string
	 */
	private static function get_subject( int $contract_id ): string {
		return "有新的合約待審核 #{$contract_id}";
	}
}
