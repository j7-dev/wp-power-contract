(function ($) {
	$(document).ready(function () {
		$('#pct__continue-btn').on('click', function () {
			// 畫面滾到最上方
			window.scrollTo({
				top: 0,
				behavior: 'smooth'
			});

			$(this).hide();
			$('#pct__continue-description').hide();
			$('#pct__submit-btn').show();
			$('.cant_edit').removeClass('cant_edit').addClass('can_edit');


			$('.pct__signature.can_edit').on('click', function () {
				// 上一層 div
				const $modal = $(this).parent().find('.pc-modal');
				const $canvas = $(this).parent().find('.pct__signature-canvas')
				const $confirmBtn = $(this).parent().find('.pct__signature-confirm');
				console.log('click', $modal);
				$modal[0].showModal();

				const signaturePad = new SignaturePad($canvas[0]);

				$confirmBtn.on('click', function () {
					const src = signaturePad.toDataURL();
					console.log('confirm', src);
				});

			});
		});
	});
})(jQuery);
