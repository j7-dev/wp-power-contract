<?php
/**
 * Stubs for J7\WpUtils classes provided by the Powerhouse plugin at runtime.
 *
 * @phpstan-stub
 */

namespace J7\WpUtils\Classes;

abstract class DTO {

	/** @var \WP_Error Error */
	protected \WP_Error $dto_error;

	/** @var static|null */
	protected static $dto_instance;

	/** @var array<string> */
	protected array $require_properties = [];

	/** @var array<string, \ReflectionProperty[]> */
	protected static array $reflection_cache = [];

	/** @var string */
	protected string $unique_key = '';

	/**
	 * @param array<string,mixed>|null $dto_data
	 * @return void
	 */
	public function __construct( protected array|null $dto_data = [] ) {}

	/** @return array<string,mixed> */
	public function to_array(): array {}

	/**
	 * @param string        $dto_class
	 * @param callable|null $data_filter
	 * @return $this|self
	 */
	public function to_dto( string $dto_class, callable $data_filter = null ): self {}

	/**
	 * @param string $property
	 * @param mixed  $value
	 * @return void
	 */
	public function __set( string $property, mixed $value ): void {}

	/**
	 * @param string $property
	 * @return bool
	 */
	public function __isset( string $property ): bool {}

	/**
	 * @param mixed $data
	 * @return static
	 */
	public static function parse( mixed $data ): static {}

	/**
	 * @param array<string,mixed> $input
	 * @return array<int,static>
	 */
	public static function parse_array( array $input ): array {}

	/** @return void */
	protected function before_init(): void {}

	/** @return void */
	protected function after_init(): void {}

	/** @return void */
	protected function validate(): void {}

	/**
	 * @param string $identifier
	 * @param bool   $md5
	 * @return string
	 */
	public function to_unique_key( string $identifier = '', bool $md5 = true ): string {}
}

abstract class WP {
	/**
	 * @param string $content
	 * @param ?bool  $ignore_html
	 * @return string
	 */
	public static function admin_do_shortcode( string $content, ?bool $ignore_html = false ) {}

	/**
	 * @param mixed         $value
	 * @param bool          $allow_br
	 * @param array<string> $skip_keys
	 * @return array<string, mixed>|string
	 */
	public static function sanitize_text_field_deep( $value, $allow_br = true, $skip_keys = [] ) {}

	/**
	 * @param array<string, mixed> $params
	 * @param array<string>        $required_params
	 * @return true
	 * @throws \Exception
	 */
	public static function include_required_params( array $params, array $required_params ): bool {}

	/**
	 * @param array<mixed> $arr
	 * @return string
	 */
	public static function array_to_table( array $arr ): string {}

	/**
	 * @param array<string, mixed> $arr
	 * @param array<string, mixed> $options
	 * @param array<string, string> $string_mapper
	 * @return string
	 */
	public static function array_to_html( array $arr, array $options = [], array $string_mapper = [] ): string {}

	/**
	 * @param array<mixed> $array
	 * @return int
	 */
	public static function array_depth( array $array ) {}

	/**
	 * @param array<string, mixed>                                                                                                               $args
	 * @param string|null                                                                                                                        $obj_type
	 * @param array{tmp_name: string|string[], name: string|string[], type: string|string[], error: string|string[], size: string|string[]}|null $files
	 * @return array{data: array<string, mixed>, meta_data: array<string, mixed>}
	 * @throws \Exception
	 */
	public static function separator( array $args, ?string $obj_type = 'post', ?array $files = null ): array {}

	/**
	 * @param string|null $obj
	 * @return string[]
	 */
	public static function get_data_fields( ?string $obj = 'post' ) {}

	/**
	 * @param string|int $attachment_id
	 * @return array{id: string, url: string}|null
	 */
	public static function get_image_info( $attachment_id ): array|null {}

	/**
	 * @param array{tmp_name: string|string[], name: string|string[], type: string|string[], error: string|string[], size: string|string[]} $files
	 * @param bool|null                                                                                                                     $upload_only
	 * @return array<int, array{id: string|null, url: string, type: string, name: string, size: string}>
	 * @throws \Exception
	 */
	public static function upload_files( array $files, ?bool $upload_only = false ): array {}

	/**
	 * @param string $base64_img
	 * @param string $filename
	 * @param ?bool  $upload_only
	 * @return array{id: int|null, url: string, type: string, name: string|null, size: int}
	 * @throws \Exception
	 */
	public static function upload_single_base64_image( string $base64_img, string $filename = 'unknown', $upload_only = false ): array {}

	/**
	 * @param array{tmp_name: string, name: string, type: string, error: string, size: string} $file
	 * @param ?bool                                                                            $upload_only
	 * @return array{0: array{id: string|null, url: string, type: string, name: string, size: string}}
	 * @throws \Exception
	 */
	public static function handle_single_files_to_media( array $file, ?bool $upload_only = false ): array {}

	/**
	 * @param array{tmp_name: string[], name: string[], type: string[], error: string[], size: string[]} $files
	 * @param ?bool                                                                                      $upload_only
	 * @return array<int, array{id: string|null, url: string, type: string, name: string, size: string}>
	 * @throws \Exception
	 */
	public static function handle_multiple_files_to_media( $files, $upload_only = false ) {}

	/**
	 * @param string $content
	 * @return bool
	 */
	public static function has_shortcode( string $content ): bool {}

	/**
	 * @param array<string, mixed>  $args
	 * @param array<string, string> $fields_mapper
	 * @return array<string, mixed>
	 */
	public static function converter( array $args, ?array $fields_mapper = [] ): array {}

	/**
	 * @param string $date_string
	 * @return int|null
	 */
	public static function wp_strtotime( string $date_string ): int|null {}

	/**
	 * @param string $table_name
	 * @return bool
	 */
	public static function is_table_exists( string $table_name ): bool {}
}

abstract class General {
	/**
	 * @param string $json_string
	 * @param mixed  $default_value
	 * @param bool   $assoc
	 * @return mixed
	 */
	public static function json_parse( $json_string, $default_value = [], $assoc = true ) {}

	/**
	 * @param array<mixed> $arr
	 * @param string       $separator
	 * @param string       $end
	 * @return string
	 */
	public static function array_spread( array $arr, $separator = '=', $end = ' ' ): string {}

	/**
	 * @param array<string, mixed> $arr
	 * @return string
	 */
	public static function array_to_grid( array $arr ): string {}

	/**
	 * @param int    $length
	 * @param string|null $keyspace
	 * @param string|null $extend
	 * @return string
	 */
	public static function random_str( int $length = 64, ?string $keyspace = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ?string $extend = '' ): string {}

	/**
	 * @param string $str
	 * @return bool
	 */
	public static function is_english( string $str ): bool {}

	/**
	 * @param string $str
	 * @return bool
	 */
	public static function contains_non_ascii( string $str ): bool {}

	/**
	 * @param string $str
	 * @return bool
	 */
	public static function is_urlencoded( string $str ): bool {}

	/**
	 * @return string|null
	 */
	public static function get_client_ip(): string|null {}

	/**
	 * @param array<array-key, mixed> $array
	 * @param callable                $callback
	 * @return mixed|null
	 */
	public static function array_find( array $array, callable $callback ) {}

	/**
	 * @param array<array-key, mixed> $arr
	 * @param array<string>|string    $keys
	 * @return array<array-key, mixed>
	 */
	public static function destruct( array $arr, array|string $keys ): array {}

	/**
	 * @param mixed $value
	 * @param mixed $new_value
	 * @return mixed
	 */
	public static function to_same_type( mixed $value, mixed $new_value ): mixed {}

	/**
	 * @param array<mixed> $keywords
	 * @return bool
	 */
	public static function in_url( array $keywords ): bool {}
}
