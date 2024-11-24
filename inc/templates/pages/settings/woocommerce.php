<?php
/**
 * Settings General Tab
 */


use J7\PowerContract\Admin\Settings;
use J7\PowerContract\Admin\SettingsDTO;


$settings_key = Settings::SETTINGS_KEY;
$settings_dto = SettingsDTO::get_instance();


printf(
/*html*/'
<sl-checkbox %1$s name="%2$s">%3$s</sl-checkbox>
<br />
<sl-checkbox %4$s name="%5$s">%6$s</sl-checkbox>
',
'checked',
"{$settings_key}[display_contract_before_checkout]",
__('Display Contract before checkout', 'power_contract'),
'checked',
"{$settings_key}[display_contract_after_checkout]",
__('Display Contract after checkout, before thank you page', 'power_contract'),
);
