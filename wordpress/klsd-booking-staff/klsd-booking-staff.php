<?php
/**
 * Plugin Name: KLSD Booking Staff Assignment
 * Description: Assign one or more Instructors to WooCommerce Bookings (wc_booking). Adds admin meta box, saves meta, exposes REST, and shows list column.
 * Version: 1.0.0
 * Author: KLSD
 * License: GPLv2 or later
 * Text Domain: klsd-bsa
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('KLSD_Booking_Staff_Assignment')) {
    final class KLSD_Booking_Staff_Assignment {
        const META_KEY   = 'klsd_assigned_instructors';
        const POST_TYPE  = 'wc_booking';
        const NONCE_NAME = 'klsd_bsa_nonce';
        const NONCE_ACT  = 'klsd_bsa_save';

        public function __construct() {
            add_action('init', [$this, 'register_meta']);
            add_action('init', [$this, 'maybe_handle_frontdoor_logout']);
            add_action('add_meta_boxes', [$this, 'add_meta_box']);
            add_action('save_post_' . self::POST_TYPE, [$this, 'save_meta'], 10, 2);

            add_filter('manage_edit-' . self::POST_TYPE . '_columns', [$this, 'add_admin_column']);
            add_action('manage_' . self::POST_TYPE . '_posts_custom_column', [$this, 'render_admin_column'], 10, 2);

            add_action('rest_api_init', [$this, 'register_rest_routes']);
        }

        public function register_meta() {
            register_post_meta(
                self::POST_TYPE,
                self::META_KEY,
                [
                    'single'       => true,
                    'type'         => 'array',
                    'default'      => [],
                    'show_in_rest' => [
                        'schema' => [
                            'type'  => 'array',
                            'items' => ['type' => 'integer'],
                        ],
                    ],
                    'auth_callback' => function() {
                        return current_user_can('edit_posts');
                    },
                ]
            );
        }

        public function add_meta_box() {
            add_meta_box(
                'klsd_bsa_metabox',
                __('Assigned Instructors', 'klsd-bsa'),
                [$this, 'render_metabox'],
                self::POST_TYPE,
                'side',
                'default'
            );
        }

        private function get_instructors() {
            $args = [
                'role'    => 'instructor',
                'orderby' => 'display_name',
                'order'   => 'ASC',
                'number'  => 1000,
                'fields'  => ['ID', 'display_name', 'user_email'],
            ];
            $query = new WP_User_Query($args);
            $users = $query->get_results();
            $out = [];
            foreach ($users as $u) {
                $out[] = [
                    'id'    => (int) $u->ID,
                    'name'  => $u->display_name ? $u->display_name : $u->user_email,
                    'email' => $u->user_email,
                ];
            }
            return $out;
        }

        public function render_metabox($post) {
            if (!current_user_can('edit_post', $post->ID)) {
                echo esc_html__('You do not have permission to edit this booking.', 'klsd-bsa');
                return;
            }

            wp_nonce_field(self::NONCE_ACT, self::NONCE_NAME);

            $assigned = get_post_meta($post->ID, self::META_KEY, true);
            if (!is_array($assigned)) {
                $assigned = [];
            }
            $instructors = $this->get_instructors();

            echo '<div style="margin:4px 0 8px;font-weight:600;">' . esc_html__('Select Instructor(s)', 'klsd-bsa') . '</div>';
            echo '<div style="max-height:240px; overflow:auto; border:1px solid #ddd; padding:8px; border-radius:4px; background:#fff;">';
            foreach ($instructors as $inst) {
                $checked = in_array($inst['id'], $assigned, true) ? ' checked' : '';
                $id_attr = 'klsd_bsa_inst_' . intval($inst['id']);
                echo '<label for="' . esc_attr($id_attr) . '" style="display:flex; align-items:center; gap:8px; margin:6px 0;">';
                echo '<input type="checkbox" id="' . esc_attr($id_attr) . '" name="klsd_bsa_instructors[]" value="' . intval($inst['id']) . '"' . $checked . ' />';
                echo '<span>' . esc_html($inst['name']) . ' <span style="color:#888;">(' . esc_html($inst['email']) . ')</span></span>';
                echo '</label>';
            }
            echo '</div>';
        }

        public function save_meta($post_id, $post) {
            if (!isset($_POST[self::NONCE_NAME]) || !wp_verify_nonce($_POST[self::NONCE_NAME], self::NONCE_ACT)) {
                return;
            }
            if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
                return;
            }
            if ($post->post_type !== self::POST_TYPE) {
                return;
            }
            if (!current_user_can('edit_post', $post_id)) {
                return;
            }

            $ids = isset($_POST['klsd_bsa_instructors']) && is_array($_POST['klsd_bsa_instructors'])
                ? array_values(array_unique(array_map('absint', $_POST['klsd_bsa_instructors'])))
                : [];

            if (!empty($ids)) {
                update_post_meta($post_id, self::META_KEY, $ids);
            } else {
                delete_post_meta($post_id, self::META_KEY);
            }
        }

        public function add_admin_column($columns) {
            $columns['klsd_bsa_instructors'] = __('Instructors', 'klsd-bsa');
            return $columns;
        }

        public function render_admin_column($column, $post_id) {
            if ($column !== 'klsd_bsa_instructors') {
                return;
            }
            $ids = get_post_meta($post_id, self::META_KEY, true);
            if (!is_array($ids) || empty($ids)) {
                echo '—';
                return;
            }
            $names = [];
            foreach ($ids as $id) {
                $user = get_user_by('id', (int) $id);
                if ($user) {
                    $names[] = esc_html($user->display_name ? $user->display_name : $user->user_email);
                }
            }
            echo $names ? implode(', ', $names) : '—';
        }

        public function maybe_handle_frontdoor_logout() {
            if (!isset($_GET['klsd_logout'])) {
                return;
            }
            $redirect = isset($_GET['redirect_to']) ? esc_url_raw(wp_unslash($_GET['redirect_to'])) : home_url('/');
            wp_logout();
            wp_safe_redirect($redirect);
            exit;
        }

        public function register_rest_routes() {
            register_rest_route(
                'klsd/v1',
                '/instructors',
                [
                    [
                        'methods'             => WP_REST_Server::READABLE,
                        'callback'            => [$this, 'rest_list_instructors'],
                        'permission_callback' => function() {
                            return current_user_can('list_users');
                        },
                    ],
                ]
            );

            register_rest_route(
                'klsd/v1',
                '/assigned-bookings',
                [
                    [
                        'methods'             => WP_REST_Server::READABLE,
                        'callback'            => [$this, 'rest_assigned_bookings'],
                        'permission_callback' => function() {
                            return current_user_can('read') || is_user_logged_in();
                        },
                        'args' => [
                            'instructor_id' => [ 'type' => 'integer', 'required' => false, 'sanitize_callback' => 'absint' ],
                            'start' => [ 'type' => 'string', 'required' => false ],
                            'end' => [ 'type' => 'string', 'required' => false ],
                        ],
                    ],
                ]
            );

            // Site timezone endpoint
            register_rest_route(
                'klsd/v1',
                '/site-tz',
                [
                    [
                        'methods'             => WP_REST_Server::READABLE,
                        'permission_callback' => '__return_true',
                        'callback'            => function() {
                            return [ 'timezone' => wp_timezone_string() ?: 'UTC' ];
                        },
                    ],
                ]
            );
        }

        public function rest_list_instructors(\WP_REST_Request $req) {
            return rest_ensure_response($this->get_instructors());
        }

        private function parse_ts($val) {
            if (!$val) return null;
            if (is_numeric($val)) return (int)$val;
            $t = strtotime((string)$val);
            return $t ? $t : null;
        }

        public function rest_assigned_bookings(\WP_REST_Request $req) {
            $current = get_current_user_id();
            $instructor_id = (int) ($req->get_param('instructor_id') ?: $current);
            if (!$instructor_id) {
                return new \WP_Error('no_user', 'Instructor not specified', [ 'status' => 400 ]);
            }
            $start = $this->parse_ts($req->get_param('start'));
            $end = $this->parse_ts($req->get_param('end'));

            $args = [
                'post_type' => self::POST_TYPE,
                'post_status' => 'any',
                'posts_per_page' => 200,
                'meta_query' => [
                    [
                        'key' => self::META_KEY,
                        'compare' => 'EXISTS',
                    ],
                ],
            ];

            $q = new \WP_Query($args);
            $items = [];
            foreach ($q->posts as $p) {
                $bid = $p->ID;

                // Verify assignment robustly
                $raw = get_post_meta($bid, self::META_KEY, true);
                $assigned_ids = [];
                if (is_array($raw)) {
                    $assigned_ids = array_map('strval', array_map('intval', $raw));
                } elseif (is_string($raw)) {
                    $decoded = json_decode($raw, true);
                    if (is_array($decoded)) {
                        $assigned_ids = array_map('strval', array_map('intval', $decoded));
                    } else {
                        $maybe = @unserialize($raw);
                        if ($maybe !== false && is_array($maybe)) {
                            $assigned_ids = array_map('strval', array_map('intval', $maybe));
                        }
                    }
                }
                if (!in_array(strval($instructor_id), $assigned_ids, true)) {
                    continue;
                }

                $start_meta = get_post_meta($bid, '_booking_start', true);
                $end_meta = get_post_meta($bid, '_booking_end', true);
                $product_id = (int) get_post_meta($bid, '_booking_product_id', true);
                $persons = get_post_meta($bid, '_booking_persons', true);

                $start_ts = is_numeric($start_meta) ? (int)$start_meta : strtotime((string)$start_meta);
                $end_ts = is_numeric($end_meta) ? (int)$end_meta : strtotime((string)$end_meta);
                if ($start && $start_ts && $start_ts < $start) continue;
                if ($end && $end_ts && $end_ts > $end) continue;

                $items[] = [
                    'id' => (int)$bid,
                    'product_id' => $product_id,
                    'start' => $start_ts ?: null,
                    'end' => $end_ts ?: null,
                    'persons' => is_numeric($persons) ? (int)$persons : $persons,
                    'title' => get_the_title($bid),
                ];
            }

            return rest_ensure_response([
                'success' => true,
                'data' => $items,
                'total' => count($items),
            ]);
        }
    }

    new KLSD_Booking_Staff_Assignment();
}
