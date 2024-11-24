<?php
/**
 * Base
 */

declare (strict_types = 1);

namespace J7\PowerContract\Utils;

use J7\PowerContract\Admin\Settings;
use J7\PowerContract\Admin\SettingsDTO;

if (class_exists('J7\PowerContract\Utils\Base')) {
	return;
}
/**
 * Class Base
 */
abstract class Base {
	const BASE_URL      = '/';
	const APP1_SELECTOR = '#power_contract';
	const APP2_SELECTOR = '#power_contract_metabox';
	const API_TIMEOUT   = '30000';
	const DEFAULT_IMAGE = 'http://1.gravatar.com/avatar/1c39955b5fe5ae1bf51a77642f052848?s=96&d=mm&r=g';

	/**
	 * I18n 字串翻譯
	 *
	 * @param string $key 翻譯的 key
	 * @return string
	 */
	public static function i18n( string $key ): string {
		return match ( $key ) {
			'contract_template_id' => __('Contract Template Id', 'power_contract'),
			'signature' =>  __('Signature', 'power_contract'),
			'user_name' =>  __('User Name', 'power_contract'),
			'contract_amount' =>  __('Contract Amount', 'power_contract'),
			'user_address' =>  __('User Address', 'power_contract'),
			'user_identity' =>  __('User Identity', 'power_contract'),
			'user_phone' =>  __('User Phone', 'power_contract'),
			'signed_contract' =>  __('Signed Contract', 'power_contract'),
			'signed_at' =>  __('Signed At', 'power_contract'),
			'screenshot_url' =>  __('Signed Contract', 'power_contract'),
			default => $key,
		};
	}
}
