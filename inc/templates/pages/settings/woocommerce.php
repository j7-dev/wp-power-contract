<?php
/**
 * Settings Woocommerce Tab
 */

use J7\PowerContract\Admin\Settings;
use J7\PowerContract\Admin\SettingsDTO;
use J7\PowerContract\Resources\ContractTemplate\Init;


$settings_key = Settings::SETTINGS_KEY;
$settings_dto = SettingsDTO::instance();


printf(
/*html*/'
<sl-checkbox %1$s name="%2$s">%3$s</sl-checkbox>
<br /><br />
<sl-divider style="--width: 4px;"></sl-divider>
<sl-checkbox %4$s name="%5$s">%6$s</sl-checkbox>
<br /><br />
<sl-checkbox %7$s name="%8$s">%9$s</sl-checkbox>
<br /><br />
',
$settings_dto->display_order_info ? 'checked' : '',
SettingsDTO::get_field_name('display_order_info'),
__('Display order information automatically', 'power_contract'),
$settings_dto->display_contract_before_checkout ? 'checked' : '',
SettingsDTO::get_field_name('display_contract_before_checkout'),
__('Display Contract before checkout', 'power_contract'),
$settings_dto->display_contract_after_checkout ? 'checked' : '',
SettingsDTO::get_field_name('display_contract_after_checkout'),
__('Display Contract after checkout, before thank you page', 'power_contract'),
);


$all_contracts = \get_posts(
	[
		'post_type'      => Init::POST_TYPE,
		'post_status'    => 'publish',
		'posts_per_page' => -1,
	]
	);


if (!$all_contracts) {
	return;
}

$options = '';

foreach ($all_contracts as $contract) {
	$options .= sprintf(
	/*html*/'
	<sl-option value="%1$s">%2$s</sl-option>
	',
	$contract->ID,
	$contract->post_title,
	);
}


printf(
/*html*/'
<sl-select label="%1$s" name="%2$s" help-text="%3$s" value="%5$s">
	%4$s
</sl-select>
',
__('Choose contract template', 'power_contract'),
SettingsDTO::get_field_name('chosen_contract_template'),
__('You can override the value by add filter `power_contract_chosen_contract_template` ', 'power_contract'),
$options,
$settings_dto->chosen_contract_template ?? '',
);
