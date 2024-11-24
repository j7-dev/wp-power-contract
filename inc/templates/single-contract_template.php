<?php // phpcs:disable

use J7\PowerContract\Admin\SettingsDTO;

global $post;
$contract_template_id = $post->ID;

$settings_dto = SettingsDTO::get_instance();
$ajax_signed_title = $settings_dto->ajax_signed_title ?? '已經收到您的合約合約簽屬';
$ajax_signed_description = $settings_dto->ajax_signed_description ?? '合約審閱需要3~5天，請耐心等候';
$ajax_signed_btn_text = $settings_dto->ajax_signed_btn_text ?? '';
$ajax_signed_btn_link = $settings_dto->ajax_signed_btn_link ?? '';

?>

<!doctype html>
<html <?php language_attributes(); ?>>

	<head>
		<meta charset="<?php bloginfo( 'charset' ); ?>">
		<meta name="viewport" content="<?php echo esc_attr( $viewport_content ); ?>">
		<link rel="profile" href="https://gmpg.org/xfn/11">
		<?php wp_head(); ?>
	</head>

	<body <?php body_class(); ?> style="background-color:#fff;">

		<main id="contract-main" class="px-8 pb-32">
			<div class="w-full max-w-[1200px] mx-auto">
				<?php \the_content(); ?>
			</div>
		</main>

		<!-- 欄位檢查警告訊息 -->
		<div id="pct__fields-validate__warning" class="tw-fixed bottom-16 left-0 w-full py-1 bg-gray-100 flex justify-center items-center z-50 text-sm text-rose-400" style="display: none;">
			<svg class="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75ZM12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z" fill="#FB7185"></path> </g></svg>
			請檢查是否所有欄位及簽名都已填寫完成
		</div>

		<!-- 繼續 & 送出按鈕，底部 BAR -->
		<div class="tw-fixed bottom-0 left-0 w-full h-16 bg-purple-600 flex justify-center items-center z-50">
			<div class="flex justify-center items-center gap-x-4">
				<p id="pct__continue-description" class="text-white m-0">審閱完成，開始簽署</p>
				<button id="pct__continue-btn" class="pc-btn pc-btn-outline outline-white text-white hover:outline-white hover:text-purple-600 hover:bg-white duration-300 transition px-6" type="button">繼續</button>
				<button id="pct__submit-btn" class="pc-btn pc-btn-outline outline-white text-white hover:outline-white hover:text-purple-600 hover:bg-white duration-300 transition px-6" type="button" style="display: none;" data-contract_template_id="<?php echo esc_attr( $contract_template_id ); ?>"><span class="pc-loading pc-loading-spinner" style="display: none;"></span>送出</button>
			</div>
		</div>

		<!-- 簽署完成 Modal -->
		<dialog id="pct__finish-modal" class="pc-modal">
			<div class="pc-modal-box">
				<div class="pc-modal-box__success" style="display: none;">
					<h3 class="pct__finish-modal__title text-lg font-bold"><?php echo esc_html( $ajax_signed_title ); ?></h3>
						<p class="pct__finish-modal__description py-4"><?php echo $ajax_signed_description; ?></p>
				</div>
				<div class="pc-modal-box__error" style="display: none;">
					<h3 class="pct__finish-modal__title text-lg font-bold"><?php echo esc_html( $ajax_signed_title ); ?></h3>
					<p class="pct__finish-modal__description py-4"><?php echo $ajax_signed_description; ?></p>
				</div>

				<?php if ( $ajax_signed_btn_text ) : ?>
				<div class="pc-modal-action">
					<a href="<?php echo esc_url( $ajax_signed_btn_link ); ?>" class="pc-btn pc-btn-primary text-white"><?php echo esc_html( $ajax_signed_btn_text ); ?></a>
					</div>
				<?php endif; ?>
			</div>
		</dialog>

		<?php wp_footer(); ?>
	</body>

</html>
