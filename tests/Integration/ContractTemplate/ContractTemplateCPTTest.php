<?php
/**
 * 合約模板 CPT 整合測試
 * 驗證 contract_template CPT 的基礎功能、查詢與 meta 管理
 *
 * @group contract_template
 */

declare( strict_types=1 );

namespace Tests\Integration\ContractTemplate;

use Tests\Integration\TestCase;
use J7\PowerContract\Resources\ContractTemplate\Init as ContractTemplateInit;

/**
 * Class ContractTemplateCPTTest
 * 測試合約模板的 CRUD 與查詢行為
 */
class ContractTemplateCPTTest extends TestCase {

	/**
	 * 初始化依賴
	 */
	protected function configure_dependencies(): void {
		// 直接使用 WordPress APIs
	}

	// ========== 冒煙測試（Smoke Tests）==========

	/**
	 * @test
	 * @group smoke
	 * contract_template CPT 支援 REST API（show_in_rest = true）
	 */
	public function test_合約模板CPT支援REST_API(): void {
		$post_type_obj = get_post_type_object( ContractTemplateInit::POST_TYPE );
		$this->assertNotNull( $post_type_obj, '合約模板 post type object 不應為 null' );
		$this->assertTrue( (bool) $post_type_obj->show_in_rest, 'contract_template 應支援 REST API' );
	}

	/**
	 * @test
	 * @group smoke
	 * contract_template CPT 支援 Block Editor（title 和 editor）
	 */
	public function test_合約模板CPT支援Block_Editor(): void {
		$post_type_obj = get_post_type_object( ContractTemplateInit::POST_TYPE );
		$this->assertNotNull( $post_type_obj );
		$this->assertTrue( post_type_supports( ContractTemplateInit::POST_TYPE, 'title' ) );
		$this->assertTrue( post_type_supports( ContractTemplateInit::POST_TYPE, 'editor' ) );
	}

	// ========== 快樂路徑（Happy Flow）==========

	/**
	 * @test
	 * @group happy
	 * 建立合約模板並查詢
	 */
	public function test_建立合約模板並查詢(): void {
		$template_id = $this->create_contract_template(
			[
				'post_title'   => '勞務合約模板',
				'post_content' => '<p>甲方姓名：[pct_input name="user_name"]</p>',
			]
		);

		$template = get_post( $template_id );
		$this->assertNotNull( $template );
		$this->assertSame( ContractTemplateInit::POST_TYPE, $template->post_type );
		$this->assertSame( '勞務合約模板', $template->post_title );
	}

	/**
	 * @test
	 * @group happy
	 * 查詢所有已發布的合約模板
	 */
	public function test_查詢所有已發布合約模板(): void {
		$template_id_1 = $this->create_contract_template( [ 'post_title' => '模板 A' ] );
		$template_id_2 = $this->create_contract_template( [ 'post_title' => '模板 B' ] );
		$template_id_3 = $this->create_contract_template( [ 'post_title' => '模板 C' ] );

		$templates = get_posts(
			[
				'post_type'      => ContractTemplateInit::POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
			]
		);

		$template_ids = wp_list_pluck( $templates, 'ID' );
		$this->assertContains( $template_id_1, $template_ids );
		$this->assertContains( $template_id_2, $template_ids );
		$this->assertContains( $template_id_3, $template_ids );
	}

	/**
	 * @test
	 * @group happy
	 * 更新合約模板標題
	 */
	public function test_更新合約模板標題(): void {
		$template_id = $this->create_contract_template(
			[ 'post_title' => '原始標題' ]
		);

		wp_update_post(
			[
				'ID'         => $template_id,
				'post_title' => '更新後標題',
			]
		);

		$template = get_post( $template_id );
		$this->assertSame( '更新後標題', $template->post_title );
	}

	/**
	 * @test
	 * @group happy
	 * 草稿狀態的合約模板不會出現在已發布查詢中
	 */
	public function test_草稿模板不出現在發布查詢(): void {
		$draft_id     = $this->create_contract_template(
			[
				'post_title'  => '草稿模板',
				'post_status' => 'draft',
			]
		);
		$published_id = $this->create_contract_template(
			[
				'post_title'  => '已發布模板',
				'post_status' => 'publish',
			]
		);

		$published_templates = get_posts(
			[
				'post_type'      => ContractTemplateInit::POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
			]
		);

		$published_ids = wp_list_pluck( $published_templates, 'ID' );
		$this->assertNotContains( $draft_id, $published_ids, '草稿模板不應出現在發布查詢中' );
		$this->assertContains( $published_id, $published_ids );
	}

	/**
	 * @test
	 * @group happy
	 * contract 是 contract_template 的子選單
	 */
	public function test_contract_CPT是合約模板的子選單(): void {
		$post_type_obj = get_post_type_object( 'contract' );
		$this->assertNotNull( $post_type_obj );
		$this->assertSame(
			'edit.php?post_type=' . ContractTemplateInit::POST_TYPE,
			$post_type_obj->show_in_menu
		);
	}

	// ========== 錯誤處理（Error Handling）==========

	/**
	 * @test
	 * @group error
	 * 刪除合約模板後無法取得
	 */
	public function test_刪除合約模板後無法取得(): void {
		$template_id = $this->create_contract_template(
			[ 'post_title' => '待刪除模板' ]
		);

		wp_delete_post( $template_id, true ); // 強制永久刪除

		$template = get_post( $template_id );
		$this->assertNull( $template, '永久刪除的模板應回傳 null' );
	}

	// ========== 邊緣案例（Edge Cases）==========

	/**
	 * @test
	 * @group edge
	 * 合約模板 post_content 含有 shortcode 語法，get_post 應原樣儲存
	 */
	public function test_合約模板內容含shortcode原樣儲存(): void {
		$content     = '[pct_input name="user_name"] [pct_signature] [pct_date]';
		$template_id = $this->create_contract_template(
			[
				'post_content' => $content,
				'post_status'  => 'publish',
			]
		);

		$template = get_post( $template_id );
		$this->assertStringContainsString( '[pct_input', $template->post_content );
		$this->assertStringContainsString( '[pct_signature]', $template->post_content );
	}

	/**
	 * @test
	 * @group edge
	 * 合約模板標題含 RTL 文字（阿拉伯文）
	 */
	public function test_合約模板標題含RTL文字(): void {
		$rtl_title   = 'عقد الخدمات المهنية';
		$template_id = $this->create_contract_template(
			[ 'post_title' => $rtl_title ]
		);

		$template = get_post( $template_id );
		$this->assertSame( $rtl_title, $template->post_title );
	}

	/**
	 * @test
	 * @group edge
	 * 大量合約模板查詢效能（不分頁，取全部）
	 */
	public function test_大量合約模板全量查詢(): void {
		$count = 15;
		for ( $i = 0; $i < $count; $i++ ) {
			$this->create_contract_template(
				[ 'post_title' => "效能測試模板 {$i}" ]
			);
		}

		$templates = get_posts(
			[
				'post_type'      => ContractTemplateInit::POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
			]
		);

		$this->assertGreaterThanOrEqual( $count, count( $templates ) );
	}
}
