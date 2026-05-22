<?php

namespace Modules\Turnstile\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Structure\Models\Organization;
use Modules\Turnstile\Models\Building;
use Modules\Turnstile\Models\OrganizationTerminal;
use Modules\Turnstile\Models\Terminal;

class TerminalSeeder extends Seeder
{
    public function run(): void
    {
        $buildings = [
            [
                'id'      => 1,
                'name'    => "\"O‘zbekiston temir yo‘llari\"AJ",
                'name_ru' => "АО «Узбекистон темир йуллари»",
                'name_en' => "JSC \"Uzbekistan Railways\"",
            ]
        ];

        $terminals = [
            [
                'id'           => 1,
                'building_id'  => 1,
                'name'         => "Kirish 1",
                'name_ru'      => "Вход 1",
                'name_en'      => "Entrance 1",
                'ip_address'           => '192.168.212.18',
                'server_ip' => '192.168.82.101',
                'url'          => 'http://192.168.82.101/redirect.php',
                'last_updated' => now(),
                'type'         => false
            ],
            [
                'id'           => 2,
                'building_id'  => 1,
                'name'         => "Kirish 2",
                'name_ru'      => "Вход 2",
                'name_en'      => "Entrance 2",
                'server_ip' => '192.168.82.101',
                'ip_address'           => '192.168.212.17',
                'url'          => 'http://192.168.82.101/redirect.php',
                'last_updated' => now(),
                'type'         => false
            ],
            [
                'id'           => 3,
                'building_id'  => 1,
                'name'         => "Kirish 3",
                'name_ru'      => "Вход 3",
                'name_en'      => "Entrance 3",
                'server_ip' => '192.168.82.101',
                'ip_address'           => '192.168.212.14',
                'url'          => 'http://192.168.82.101/redirect.php',
                'last_updated' => now(),
                'type'         => false
            ],
            [
                'id'           => 4,
                'building_id'  => 1,
                'name'         => "Kirish 4",
                'name_ru'      => "Вход 4",
                'name_en'      => "Entrance 4",
                'server_ip' => '192.168.82.101',
                'ip_address'           => '192.168.212.13',
                'url'          => 'http://192.168.82.101/redirect.php',
                'last_updated' => now(),
                'type'         => false
            ],
            [
                'id'           => 5,
                'building_id'  => 1,
                'name'         => "Chiqish 1",
                'name_ru'      => "Выход 1",
                'name_en'      => "Exit 1",
                'server_ip' => '192.168.82.101',
                'ip_address'           => '192.168.212.15',
                'url'          => 'http://192.168.82.101/redirect.php',
                'last_updated' => now(),
                'type'         => false
            ],
            [
                'id'           => 6,
                'building_id'  => 1,
                'name'         => "Chiqish 2",
                'name_ru'      => "Выход 2",
                'name_en'      => "Exit 2",
                'server_ip' => '192.168.82.101',
                'ip_address'           => '192.168.212.12',
                'url'          => 'http://192.168.82.101/redirect.php',
                'last_updated' => now(),
                'type'         => false
            ],
            [
                'id'           => 7,
                'building_id'  => 1,
                'name'         => "Chiqish 3",
                'name_ru'      => "Выход 3",
                'name_en'      => "Exit 3",
                'server_ip' => '192.168.82.101',
                'ip_address'           => '192.168.212.16',
                'url'          => 'http://192.168.82.101/redirect.php',
                'last_updated' => now(),
                'type'         => false
            ],
            [
                'id'           => 8,
                'building_id'  => 1,
                'name'         => "Chiqish 4",
                'name_ru'      => "Выход 4",
                'name_en'      => "Exit 4",
                'server_ip' => '192.168.82.101',
                'ip_address'           => '192.168.212.11',
                'url'          => 'http://192.168.82.101/redirect.php',
                'last_updated' => now(),
                'type'         => false
            ]
        ];

        Building::insert($buildings);
        Terminal::insert($terminals);

        $json = file_get_contents(base_path('database/seeders/json/organization_terminals.json'));
        $terminals = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $organizations = Organization::all();
        $newTerminals = Terminal::all();
        $data = [];
        foreach (collect($terminals) as $item) {
            $org = $organizations->where('external', $item['organization_id'])->first();
            if (!$org) {
                continue;
            }
            $newTerminal = $newTerminals->where('ip_address', $item['ip'])->first();
            if ($newTerminal) {
                $data[] = [
                    'organization_id' => $org->id,
                    'terminal_id'     => $newTerminal['id'],
                ];
            }

        }
        OrganizationTerminal::insert($data);
    }
}
