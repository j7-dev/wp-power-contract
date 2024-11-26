<?php
/**
 * Settings Woocommerce Tab
 */

use J7\PowerContract\Admin\Settings;
use J7\PowerContract\Admin\SettingsDTO;


$settings_key = Settings::SETTINGS_KEY;
$settings_dto = SettingsDTO::get_instance();


printf(
/*html*/'
<sl-checkbox %1$s name="%2$s">%3$s</sl-checkbox>
<br /><br />
<sl-checkbox %4$s name="%5$s">%6$s</sl-checkbox>
<br /><br />
<sl-checkbox %7$s name="%8$s">%9$s</sl-checkbox>
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
