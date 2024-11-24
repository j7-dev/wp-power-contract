<?php
/**
 * Setting tabs
 */

use J7\PowerContract\Plugin;

return [
	'general' => [
		'title'    => __('General', 'power_contract'),
		'disabled' => false,
		'content'  => Plugin::get('settings/general', null, false),
	],
	'woocommerce' => [
		'title'    => __('Woocommerce', 'power_contract'),
		'disabled' => !class_exists('WooCommerce'),
		'content'  => !class_exists('WooCommerce') ? __('Woocommerce is not installed', 'power_contract') : Plugin::get('settings/woocommerce', null, false),
	],
];
