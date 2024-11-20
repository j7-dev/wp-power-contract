<?php
/**
 * Settings Page
 */

use J7\PowerContract\Utils\Base;
use J7\PowerContract\Plugin;
use J7\PowerContract\Admin\Settings;


$settings_key = Settings::SETTINGS_KEY;
$options      = Base::get_settings();

echo '<div class="wrap">';
echo '<h1>' . \esc_html__('Contract Template Settings', 'power_contract') . '</h1>';

echo '<form method="post" action="options.php">';
\settings_fields($settings_key);
\do_settings_sections($settings_key);

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
"{$settings_key}[ajax_signed_title]",
$options['ajax_signed_title'] ?? '已收到您的合約簽屬，等待審閱!',
__('We\'ve received your contract signature', 'power_contract'),
__('Description', 'power_contract'),
"{$settings_key}[ajax_signed_description]",
$options['ajax_signed_description'] ?? '審閱完成後會立即通知您，並為您開通課程',
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
 <sl-input label="%1$s" name="%2$s" value="%3$s" class="mb-4" help-text="%4$s"></sl-input>
 <sl-input label="%5$s" name="%6$s" value="%7$s" class="mb-4" placeholder="%8$s"></sl-input>
 ',
__('Button text', 'power_contract'),
"{$settings_key}[ajax_signed_btn_text]",
$options['ajax_signed_btn_text'] ?? '',
__('leave blank to hide button', 'power_contract'),
__('Button link', 'power_contract'),
"{$settings_key}[ajax_signed_btn_link]",
$options['ajax_signed_btn_link'] ?? '',
__('ex: https://www.google.com', 'power_contract'),
);

\submit_button();

echo '</form>';
echo '</div>';
