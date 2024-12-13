<?php
/**
 * Settings Email Tab
 */

use J7\PowerContract\Admin\Settings;
use J7\PowerContract\Admin\SettingsDTO;
use J7\PowerContract\Plugin;


$settings_key = Settings::SETTINGS_KEY;
$settings_dto = SettingsDTO::instance();

$emails = $settings_dto->emails;

Plugin::safe_get(
	'typography/title',
	[
		'value' => __('The email recipients to be notified for contract review.', 'power_contract'),
	]
);



echo '<div class="pct-emails">';
foreach ($emails as $index => $email) {
	printf(
	/*html*/'
	<div data-index="%1$s" class="pct-email-row mb-4 flex items-center gap-x-4">
		<sl-input name="%2$s" value="%3$s" placeholder="ex: test@gmail.com" size="small" class="w-[20rem]"></sl-input>
		<sl-icon name="dash-circle" class="cursor-pointer"></sl-icon>
		<sl-icon name="plus-circle" class="cursor-pointer"></sl-icon>
	</div>
	',
	$index,
	SettingsDTO::get_field_name('emails]['), // 為了拚出 power_contract_settings[emails][] 這種格式
	$email,
	);
}
echo '</div>';

?>

<script>
(function($) {

	// 移除
	$('.pct-emails').on('click', 'sl-icon[name="dash-circle"]', function(e) {
		e.stopPropagation();
		if (1 === $('.pct-email-row').length) {
			return;
		}
		const index = $(this).closest('.pct-email-row').data('index');
		$(this).closest('.pct-email-row').remove();
		reOrder();
	});

	$('.pct-emails').on('click', 'sl-icon[name="plus-circle"]', function(e) {
		e.stopPropagation();
		const index = $(this).closest('.pct-email-row').data('index');

		// 複製當前的 pct-email-row
		const $newRow = $(this).closest('.pct-email-row').clone();

		// 插入在當前 row 的後面
		$(this).closest('.pct-email-row').after($newRow);

		reOrder();
	});

	function reOrder() {
		$('.pct-email-row').each(function(index) {
			$(this).attr('data-index', index);
		});
	}

})(jQuery)


</script>
