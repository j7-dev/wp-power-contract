/* eslint-disable @typescript-eslint/no-explicit-any */
import jQuery, { JQuery } from 'jquery'
import SignaturePad from 'signature_pad'
import domtoimage from 'dom-to-image'
import '@/assets/scss/index.scss'

declare const signature_pad_custom_data: {
	env?: {
		nonce?: string
		ajaxUrl?: string
		returnUrl?: string
	}
}
	; (function ($: typeof jQuery) {
		$(document).ready(function () {
			; ($('#pct__continue-btn') as JQuery<HTMLButtonElement>).on(
				'click',
				function () {
					// 畫面滾到最上方
					window.scrollTo({
						top: 0,
						behavior: 'smooth',
					})

					$(this).hide()
					$('#pct__continue-description').hide()
					const $submitBtn = $('#pct__submit-btn').show()
					$('.cant_edit').removeClass('cant_edit').addClass('can_edit')
						; ($('.pct__signature.can_edit') as JQuery<HTMLDivElement>).on(
							'click',
							function () {
								// 上一層 div
								const $signatureField = $(this)
								const $modal = $(this)
									.parent()
									.find('dialog.pc-modal') as JQuery<HTMLDialogElement>
								if (!$modal) {
									return
								}
								const $canvas = $(this).parent().find('.pct__signature-canvas')
								const $confirmBtn = $(this).parent().find('.pct__signature-confirm')

								$modal[0].showModal()
									; ($canvas[0] as HTMLCanvasElement).width = $modal
										.find('.pc-modal-box')
										.width() as number
									; ($canvas[0] as HTMLCanvasElement).height = Math.min(
										($modal.height() as number) - 284,
										(($canvas[0] as HTMLCanvasElement).width / 16) * 9,
									)
								const signaturePad = new SignaturePad(
									$canvas[0] as HTMLCanvasElement,
								)
								$confirmBtn.on('click', function () {
									const src = signaturePad.toDataURL()
									$signatureField.html(`<img src="${src}" class="w-full" />`)
								})

								// 監聽關閉事件
								$modal.on('close', function () {
									// 關閉時移除點擊事件
									$confirmBtn.off('click')
								})
							},
						)

					/**
					 * 驗證所有欄位是否填寫完成
					 *
					 * @return {boolean}
					 */
					const validFields = () => {
						// const isValid = validateFields();
						let isValid = true

						// 其中一個 input 沒有值 就 false
						isValid = !($('input.can_edit').toArray() as HTMLInputElement[]).some(
							function (input) {
								return !input.value
							},
						)

						if ($('.pct__signature img').length === 0) {
							isValid = false
						}
						return isValid
					}

					$submitBtn.on('click', async function () {
						const isValid = validFields()

						if (!isValid) {
							$('#pct__fields-validate__warning').show()
							return
						}

						const nonce = signature_pad_custom_data?.env?.nonce
						const ajaxUrl = signature_pad_custom_data?.env?.ajaxUrl
						const returnUrl =
							signature_pad_custom_data?.env?.returnUrl || window.location.origin
						const contract_template_id = $(this as HTMLButtonElement).data(
							'contract_template_id',
						)

						// collect input data to inputData with reduce
						const inputData = ($('input.can_edit') as JQuery<HTMLInputElement>)
							.toArray()
							.reduce((acc: { [key: string]: string }, input) => {
								acc[input.name] = input.value
								return acc
							}, {})

						if (!nonce || !ajaxUrl || !contract_template_id) {
							console.error('nonce, ajaxUrl, contract_template_id is required')
							alert('缺少必要參數')
							return
						}

						const formData = new FormData()
						formData.append('action', 'create_contract') // WordPress AJAX action
						formData.append('nonce', nonce) // WordPress 安全檢查用
						formData.append('contract_template_id', contract_template_id)

						// 如果 url params 有帶 order_id 就 append 到 formData
						const urlParams = new URLSearchParams(window.location.search)
						const orderId = urlParams.get('order_id')
						if (orderId) {
							formData.append('_order_id', orderId)
						}

						formData.append(
							'signature',
							($('.pct__signature img') as JQuery<HTMLImageElement>).attr(
								'src',
							) as string,
						)
						Object.keys(inputData).forEach((key) => {
							formData.append(key, inputData[key])
						})

						// 將合約主體 DOM 轉換成圖片跟著 API 送出
						const contractMain = document.getElementById('contract-main')
						if (!contractMain) {
							console.error('contractMain is not found')
							return
						}

						// 先將可以編輯的欄位背景變透明
						$('.can_edit').css('backgroundColor', 'transparent')
						$('.pct__signature').css('border', 'none')

						$submitBtn.find('.pc-loading').show()
						try {
							const dataUrl = await domtoimage.toJpeg(contractMain, {
								quality: 1,
								bgcolor: '#fff',
							})
							formData.append('screenshot', dataUrl)
						} catch (error) {
							console.error('error', error)
							// return
						}

						// ajax insert data
						$.post({
							url: ajaxUrl,
							data: formData,
							processData: false, // 必須設為 false
							contentType: false, // 必須設為 false
						})
							.done(function (response) {
								$submitBtn.find('.pc-loading').hide()
									; ($('#pct__finish-modal')[0] as HTMLDialogElement).showModal()

								const isSuccess = response?.code === 'sign_success'

								if (isSuccess) {
									$('#pct__finish-modal').find('.pc-modal-box__success').show()
									$('#pct__finish-modal').find('.pc-modal-box__error').hide()
								} else {
									$('#pct__finish-modal').find('.pc-modal-box__success').hide()
									$('#pct__finish-modal').find('.pc-modal-box__error').show()
								}
							})
							.fail(function (xhr, status, error) {
								console.error('error', error)
								console.error('status', status)
							})
					})
				},
			)
		})
	})(jQuery)
