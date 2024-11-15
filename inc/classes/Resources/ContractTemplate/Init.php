<?php
/**
 * Custom Post Type: Power Contract Template
 */

declare(strict_types=1);

namespace J7\PowerContract\Resources\ContractTemplate;

use J7\PowerContract\Plugin;



if (class_exists('J7\PowerContract\Resources\ContractTemplate')) {
	return;
}
/**
 * Class Init
 */
final class Init {
	use \J7\WpUtils\Traits\SingletonTrait;

	const POST_TYPE = 'contract_template';

	/**
	 * Constructor
	 */
	public function __construct() {
		\add_action( 'init', [ __CLASS__, 'register_cpt' ] );
		\add_action( 'load-post.php', [ __CLASS__, 'init_metabox' ] );
		\add_action( 'load-post-new.php', [ __CLASS__, 'init_metabox' ] );
		\add_filter( 'template_include', [ __CLASS__, 'load_custom_template' ], 9999 );
	}

	/**
	 * Register power-contract-template custom post type
	 */
	public static function register_cpt(): void {
		$labels = [
			'name'                     => \esc_html__( 'Contract Template', 'power_contract' ),
			'singular_name'            => \esc_html__( 'power-contract-template', 'power_contract' ),
			'add_new'                  => \esc_html__( 'Add new', 'power_contract' ),
			'add_new_item'             => \esc_html__( 'Add new item', 'power_contract' ),
			'edit_item'                => \esc_html__( 'Edit', 'power_contract' ),
			'new_item'                 => \esc_html__( 'New', 'power_contract' ),
			'view_item'                => \esc_html__( 'View', 'power_contract' ),
			'view_items'               => \esc_html__( 'View', 'power_contract' ),
			'search_items'             => \esc_html__( 'Search power-contract-template', 'power_contract' ),
			'not_found'                => \esc_html__( 'Not Found', 'power_contract' ),
			'not_found_in_trash'       => \esc_html__( 'Not found in trash', 'power_contract' ),
			'parent_item_colon'        => \esc_html__( 'Parent item', 'power_contract' ),
			'all_items'                => \esc_html__( 'All', 'power_contract' ),
			'archives'                 => \esc_html__( 'power-contract-template archives', 'power_contract' ),
			'attributes'               => \esc_html__( 'power-contract-template attributes', 'power_contract' ),
			'insert_into_item'         => \esc_html__( 'Insert to this power-contract-template', 'power_contract' ),
			'uploaded_to_this_item'    => \esc_html__( 'Uploaded to this power-contract-template', 'power_contract' ),
			'featured_image'           => \esc_html__( 'Featured image', 'power_contract' ),
			'set_featured_image'       => \esc_html__( 'Set featured image', 'power_contract' ),
			'remove_featured_image'    => \esc_html__( 'Remove featured image', 'power_contract' ),
			'use_featured_image'       => \esc_html__( 'Use featured image', 'power_contract' ),
			'menu_name'                => \esc_html__( 'power-contract-template', 'power_contract' ),
			'filter_items_list'        => \esc_html__( 'Filter power-contract-template list', 'power_contract' ),
			'filter_by_date'           => \esc_html__( 'Filter by date', 'power_contract' ),
			'items_list_navigation'    => \esc_html__( 'power-contract-template list navigation', 'power_contract' ),
			'items_list'               => \esc_html__( 'power-contract-template list', 'power_contract' ),
			'item_published'           => \esc_html__( 'power-contract-template published', 'power_contract' ),
			'item_published_privately' => \esc_html__( 'power-contract-template published privately', 'power_contract' ),
			'item_reverted_to_draft'   => \esc_html__( 'power-contract-template reverted to draft', 'power_contract' ),
			'item_scheduled'           => \esc_html__( 'power-contract-template scheduled', 'power_contract' ),
			'item_updated'             => \esc_html__( 'power-contract-template updated', 'power_contract' ),
		];
		$args   = [
			'label'                 => \esc_html__( 'Contract Template', 'power_contract' ),
			'labels'                => $labels,
			'description'           => '',
			'public'                => true,
			'hierarchical'          => false,
			'exclude_from_search'   => true,
			'publicly_queryable'    => true,
			'show_ui'               => true,
			'show_in_nav_menus'     => false,
			'show_in_admin_bar'     => false,
			'show_in_rest'          => true,
			'query_var'             => false,
			'can_export'            => true,
			'delete_with_user'      => true,
			'has_archive'           => false,
			'rest_base'             => '',
			'show_in_menu'          => true,
			'menu_position'         => 6,
			'menu_icon'             => 'dashicons-media-document',
			'capability_type'       => 'post',
			'supports'              => [ 'title', 'editor', 'thumbnail', 'custom-fields', 'author' ],
			'taxonomies'            => [],
			'rest_controller_class' => 'WP_REST_Posts_Controller',
			'rewrite'               => [
				'with_front' => true,
			],
		];

		\register_post_type( self::POST_TYPE, $args );
	}


	/**
	 * Meta box initialization.
	 */
	public static function init_metabox(): void {
		\add_action( 'add_meta_boxes', [ __CLASS__, 'add_metabox' ] );
	}

	/**
	 * Adds the meta box.
	 *
	 * @param string $post_type Post type.
	 */
	public static function add_metabox( string $post_type ): void {
		if ( in_array( $post_type, [ Plugin::$kebab ], true ) ) {
			\add_meta_box(
				Plugin::$kebab . '-metabox',
				__( 'Power Contract', 'power_contract' ),
				[ __CLASS__, 'render_meta_box' ],
				$post_type,
				'advanced',
				'high'
			);
		}
	}

	/**
	 * Render meta box.
	 */
	public static function render_meta_box(): void {
		echo '<div id="power_contract_metabox"></div>';
	}

	/**
	 * Load custom template
	 * Set {Plugin::$kebab}/{slug}/report  php template
	 *
	 * @param string|null $template Template.
	 */
	public static function load_custom_template( $template ) {
		if (\is_singular(self::POST_TYPE)) {  // 'course' 是你的 custom post type
			return Plugin::$dir . '/inc/templates/contract-template.php';
		}
		return $template;
	}
}
