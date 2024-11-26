<?php
/**
 * Settings Page
 */

use J7\PowerContract\Admin\Settings;

$settings     = Settings::instance();
$settings_key = Settings::SETTINGS_KEY;

echo '<div class="wrap">';
echo '<h1>' . \esc_html__('Contract Template Settings', 'power_contract') . '</h1>';


/*
printf(
'
<sl-alert open class="mt-8 mb-4">
<sl-icon slot="icon" name="info-circle"></sl-icon>
%1$s
</sl-alert>
',
__('You can override the default settings in contract template post', 'power_contract'),
);
*/
echo '<form method="post" action="options.php">';
\settings_fields($settings_key);
\do_settings_sections($settings_key);

echo '<sl-tab-group>';
foreach ($settings->tabs as $tab_key => $setting_tab) {
	printf(
	/*html*/'<sl-tab slot="nav" panel="%1$s" %2$s>%3$s</sl-tab>',
	$tab_key,
	$setting_tab['disabled'] ? 'disabled' : '',
	$setting_tab['title'],
	);

	printf(
	/*html*/'<sl-tab-panel name="%1$s">%2$s</sl-tab-panel>',
	$tab_key,
	$setting_tab['content'],
	);
}
echo '</sl-tab-group>';

\submit_button();

echo '</form>';
echo '</div>';
