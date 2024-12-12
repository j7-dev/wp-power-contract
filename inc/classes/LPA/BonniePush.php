<?php
/**
 * 重寫 oberon bonnie 外掛的 Bonnie_Push 類別
 * 因為 原本的 body 維 private property 無法修改
 */

declare(strict_types=1);

namespace J7\PowerContract\LPA;

if (class_exists('J7\PowerContract\LPA\BonniePush')) {
	return;
}

/**
 * Class Bonnie Push
 */
final class BonniePush {
	/**
	 * API body
	 *
	 * @var array
	 */
	public $body = [];

	/**
	 * API option
	 *
	 * @var array
	 */
	public $option = [];

	/**
	 * Construct
	 *
	 * @param string $bot_raw_uid LINE User ID.
	 * @param string $bot_pid     LINE OA ID.
	 */
	public function __construct( $bot_raw_uid, $bot_pid ) {
		$this->body['bot_raw_uid'] = $bot_raw_uid;
		$this->body['bot_pid']     = $bot_pid;
	}

	/**
	 * Add message
	 *
	 * @param string $message push message text.
	 */
	public function add_message( $message, $buttons = null ) {
		unset( $this->body['bot_mid'] );
		$this->body['message'] = [
			'type' => 'text',
			'text' => $message,
		];
		if ( $buttons ) {
			$this->body['message']['buttons'] = $buttons;
		}

		return $this->process();
	}

	/**
	 * Add module
	 *
	 * @param string $module_id Bonnie module id.
	 */
	public function add_module( $module_id ) {
		unset( $this->body['message'] );
		$this->body['bot_mid'] = $module_id;

		return $this->process();
	}

	/**
	 * Call Bonnie api
	 */
	public function process() {
		$this->body['bot_id']      = BONNIE_BOT_ID;
		$this->body['bot_channel'] = 1;
		$this->option['timeout']   = 120;
		$this->option['method']    = 'POST';
		$this->option['headers']   = [
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . BONNIE_BOT_TOKEN,
		];
		$this->option['body']      = wp_json_encode( $this->body );

		$response = wp_remote_request( 'https://api.botbonnie.com/v1/api/message/push', $this->option );

		if ( is_wp_error( $response ) ) {
			$result = $response->get_error_message();
			wc_get_logger()->debug( wc_print_r( $response, true ), [ 'source' => 'ods-log' ] );
		} else {
			$result = json_decode( wp_remote_retrieve_body( $response ) );
			if ( property_exists( $result, 'errorCode' ) ) {
				wc_get_logger()->debug( wc_print_r( $response, true ), [ 'source' => 'bonnie-log' ] );
			}
		}

		return $result;
	}
}
