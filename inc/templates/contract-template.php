<?php // phpcs:disable
global $post;
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

		<main class="px-8 pb-32">
			<div class="w-full max-w-[1200px] mx-auto">
				<?php \the_content(); ?>
			</div>
		</main>

		<div class="tw-fixed bottom-0 left-0 w-full h-16 bg-purple-600 flex justify-center items-center z-50">
			<div class="flex justify-center items-center gap-x-4">
				<p id="pct__continue-description" class="text-white m-0">審閱完成，開始簽署</p>
				<button id="pct__continue-btn" class="pc-btn pc-btn-outline outline-white text-white hover:outline-white hover:text-purple-600 hover:bg-white duration-300 transition px-6" type="button">繼續</button>
				<button id="pct__submit-btn" class="pc-btn pc-btn-outline outline-white text-white hover:outline-white hover:text-purple-600 hover:bg-white duration-300 transition px-6" type="button" style="display: none;">送出</button>
			</div>
		</div>

		<?php wp_footer(); ?>
	</body>

</html>
