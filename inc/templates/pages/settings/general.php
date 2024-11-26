<?php
/**
 * Settings General Tab
 */

use J7\PowerContract\Plugin;
use J7\PowerContract\Admin\Settings;
use J7\PowerContract\Admin\SettingsDTO;

$settings_key = Settings::SETTINGS_KEY;
$settings_dto = SettingsDTO::get_instance();



Plugin::safe_get(
	'typography/title',
	[
		'value' => __('Modal message after signed successfully', 'power_contract'),
	]
);

printf(
/*html*/'
 <sl-input label="%1$s" name="%2$s" value="%3$s" class="mb-4" placeholder="%4$s"></sl-input>
 <sl-textarea label="%5$s" name="%6$s" value="%7$s" class="mb-4" placeholder="%8$s" help-text="%9$s"></sl-textarea>
 ',
__('Title', 'power_contract'),
SettingsDTO::get_field_name('ajax_signed_title'),
$settings_dto->ajax_signed_title ?? '已收到您的合約簽屬，等待審閱!',
__('We\'ve received your contract signature', 'power_contract'),
__('Description', 'power_contract'),
SettingsDTO::get_field_name('ajax_signed_description'),
$settings_dto->ajax_signed_description ?? '審閱完成後會立即通知您，並為您開通課程',
__('It might take 3~5 days to review, please be patient', 'power_contract'),
__('support html, like <br />, <a href=\'url\'>link</a>', 'power_contract'),
);


Plugin::safe_get(
	'typography/title',
	[
		'value' => __('Modal action button', 'power_contract'),
	]
);

printf(
/*html*/'
 <sl-input label="%1$s" name="%2$s" value="%3$s" class="mb-4" placeholder="%4$s" help-text="%5$s"></sl-input>
 <sl-input label="%6$s" name="%7$s" value="%8$s" class="mb-4" placeholder="%9$s" help-text="%10$s"></sl-input>
 ',
__('Button text', 'power_contract'),
SettingsDTO::get_field_name('ajax_signed_btn_text'),
$settings_dto->ajax_signed_btn_text ?? '',
__('ex: Continue Checkout', 'power_contract'),
__('Leave blank to hide button, or if you want user to sign contract before checkout, you can type \'Continue Checkout\'', 'power_contract'),
__('Button link', 'power_contract'),
SettingsDTO::get_field_name('ajax_signed_btn_link'),
$settings_dto->ajax_signed_btn_link ?? '',
sprintf(__('ex: %s', 'power_contract'), \site_url('checkout')),
sprintf(__('If you want user to sign contract before checkout, you can type \'%s\'', 'power_contract'), \site_url('checkout')),
);
